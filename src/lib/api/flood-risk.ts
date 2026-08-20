import { nasaPowerAPI } from './nasa-power';
import { srtmAPI } from './srtm';
import type { Coordinates } from '@/types';
import { validateClimateInputs } from '@/lib/validation/climate-data';
import type { ValidationWarning } from '@/lib/validation/climate-data';

export interface FloodRiskData {
  coordinates: Coordinates;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  factors: {
    rainfall: {
      recent: number;
      average: number;
      anomaly: number;
      contribution: number;
    };
    elevation: {
      value: number;
      contribution: number;
    };
    slope: {
      value: number;
      contribution: number;
    };
  };
  timestamp: Date;
  validationWarnings?: ValidationWarning[];
}

export class FloodRiskAPI {
  /**
   * Calculate comprehensive flood risk score for a location
   * Combines NASA POWER rainfall data with SRTM elevation/slope analysis
   */
  async calculateFloodRisk(
    lat: number,
    lon: number,
    startDate?: string,
    endDate?: string
  ): Promise<FloodRiskData> {
    const validationWarnings: ValidationWarning[] = [];

    try {
      // Validate coordinates before any API calls
      const validated = validateClimateInputs(lat, lon);
      validationWarnings.push(...validated.warnings);
      const { lat: validLat, lon: validLon } = validated.coordinates;
      lat = validLat;
      lon = validLon;

      // Default to last 30 days if not specified.
      // NASA POWER has ~2-5 day data lag — cap end date to avoid empty responses.
      if (!endDate) {
        const capDate = new Date();
        capDate.setDate(capDate.getDate() - 5);
        endDate = capDate.toISOString().split('T')[0].replace(/-/g, '');
      }
      if (!startDate) {
        const date = new Date();
        date.setDate(date.getDate() - 35); // 30 days before the capped end date
        startDate = date.toISOString().split('T')[0].replace(/-/g, '');
      }

      // Fetch data in parallel — use fallbacks if APIs fail
      let rainfallData = null;
      let elevationData = null;

      try {
        [rainfallData, elevationData] = await Promise.all([
          nasaPowerAPI.getRainfallData(lat, lon, startDate, endDate),
          srtmAPI.getElevationData({ lat, lon }),
        ]);
      } catch (fetchError) {
        console.warn('Flood risk: API fetch partial failure, using fallbacks', fetchError);
      }

      // Calculate rainfall factors from NASA POWER data or fallback
      const precipValues = rainfallData?.properties?.parameter?.PRECTOTCORR
        ? Object.values(rainfallData.properties.parameter.PRECTOTCORR).filter(
            (p): p is number => typeof p === 'number' && p >= 0
          )
        : [];

      let avgRecent: number;
      let avgTotal: number;
      let rainfallAnomaly: number;

      if (precipValues.length === 0) {
        const rainFallback = validateClimateInputs(lat, lon, undefined);
        validationWarnings.push(...rainFallback.warnings.filter((w) => w.field === 'rainfall'));
        avgRecent = rainFallback.rainfall;
        avgTotal = rainFallback.rainfall;
        rainfallAnomaly = 0;
      } else {
        const recentPrecip = precipValues.slice(-7);
        avgRecent = recentPrecip.reduce((a, b) => a + b, 0) / recentPrecip.length;
        avgTotal = precipValues.reduce((a, b) => a + b, 0) / precipValues.length;
        rainfallAnomaly = avgTotal > 0 ? (avgRecent - avgTotal) / avgTotal : 0;
      }

      const elevation = elevationData?.elevation ?? 1500;
      const slope = elevationData?.slope ?? 5;

      // Calculate risk contributions (0-1 scale)
      const rainfallContribution = this.calculateRainfallRisk(avgRecent, rainfallAnomaly);
      const elevationContribution = this.calculateElevationRisk(elevation);
      const slopeContribution = this.calculateSlopeRisk(slope);

      // Weighted flood risk score
      const riskScore = (
        0.5 * rainfallContribution +
        0.3 * elevationContribution +
        0.2 * slopeContribution
      );

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'extreme';
      if (riskScore >= 0.75) {
        riskLevel = 'extreme';
      } else if (riskScore >= 0.5) {
        riskLevel = 'high';
      } else if (riskScore >= 0.25) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }

      return {
        coordinates: { lat, lon },
        riskScore,
        riskLevel,
        factors: {
          rainfall: {
            recent: avgRecent,
            average: avgTotal,
            anomaly: rainfallAnomaly,
            contribution: rainfallContribution,
          },
          elevation: {
            value: elevation,
            contribution: elevationContribution,
          },
          slope: {
            value: slope,
            contribution: slopeContribution,
          },
        },
        timestamp: new Date(),
        validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined,
      };
    } catch (error) {
      console.error('Flood Risk Calculation Error:', error);
      // Return safe fallback — never crash the application
      const fallback = validateClimateInputs(lat, lon);
      return {
        coordinates: fallback.coordinates,
        riskScore: 0.25,
        riskLevel: 'medium',
        factors: {
          rainfall: { recent: fallback.rainfall, average: fallback.rainfall, anomaly: 0, contribution: 0.1 },
          elevation: { value: 1500, contribution: 0.3 },
          slope: { value: 5, contribution: 0.5 },
        },
        timestamp: new Date(),
        validationWarnings: [
          ...fallback.warnings,
          { field: 'calculation', message: 'Risk calculation encountered an error. Showing estimated values.', usedFallback: true },
        ],
      };
    }
  }

  /**
   * Calculate rainfall risk contribution (0-1)
   * Uses both absolute rainfall and relative anomaly
   */
  private calculateRainfallRisk(recentRainfall: number, anomaly: number): number {
    let rainfallRisk = 0;

    // Absolute rainfall contribution (mm/day)
    // Rwanda typical daily rainfall: 2-5mm, heavy: >10mm, extreme: >20mm
    if (recentRainfall > 25) {
      rainfallRisk += 0.6; // Extreme rain - very high flood risk
    } else if (recentRainfall > 15) {
      rainfallRisk += 0.4; // Heavy rain - high risk
    } else if (recentRainfall > 10) {
      rainfallRisk += 0.25; // Moderate-heavy rain
    } else if (recentRainfall > 5) {
      rainfallRisk += 0.1; // Light-moderate rain
    }

    // Rainfall anomaly contribution (comparing to historical average)
    // Positive anomaly means more rain than normal
    if (anomaly > 0.8) {
      rainfallRisk += 0.4; // Much higher than average - saturated soil
    } else if (anomaly > 0.5) {
      rainfallRisk += 0.3; // Significantly higher
    } else if (anomaly > 0.3) {
      rainfallRisk += 0.2; // Higher than average
    } else if (anomaly > 0.1) {
      rainfallRisk += 0.1; // Slightly higher
    }

    return Math.min(1, rainfallRisk);
  }

  /**
   * Calculate elevation risk contribution (0-1)
   * Lower elevations accumulate water, higher elevations drain better
   */
  private calculateElevationRisk(elevation: number): number {
    // Rwanda elevation range: ~900m (valleys/lakes) to ~4500m (mountains)
    // Lake Kivu: ~1460m, Kigali: ~1500-1600m
    // High flood risk in low-lying areas near water bodies

    if (elevation < 1300) {
      return 0.9; // Very high risk - near water level
    } else if (elevation < 1450) {
      return 0.7; // High risk - low-lying valleys
    } else if (elevation < 1600) {
      return 0.5; // Moderate risk - typical inhabited areas
    } else if (elevation < 1800) {
      return 0.3; // Lower risk - elevated areas
    } else if (elevation < 2200) {
      return 0.15; // Low risk - highlands
    } else {
      return 0.05; // Very low risk - mountains
    }
  }

  /**
   * Calculate slope risk contribution (0-1)
   * Flat areas accumulate water, steep areas drain quickly
   */
  private calculateSlopeRisk(slope: number): number {
    // Slope in degrees
    // 0-1°: Flat (flood-prone)
    // 1-3°: Very gentle (water pools)
    // 3-8°: Gentle (some drainage)
    // 8-15°: Moderate (good drainage)
    // >15°: Steep (rapid drainage, but erosion risk)

    if (slope < 1) {
      return 1.0; // Completely flat - water pools
    } else if (slope < 3) {
      return 0.8; // Very gentle - high accumulation
    } else if (slope < 6) {
      return 0.5; // Gentle - moderate accumulation
    } else if (slope < 10) {
      return 0.3; // Moderate - some drainage
    } else if (slope < 15) {
      return 0.15; // Steeper - good drainage
    } else {
      return 0.05; // Very steep - rapid drainage
    }
  }

  /**
   * Generate flood risk heatmap data for a bounding box
   * Returns grid of risk scores
   */
  async generateFloodRiskGrid(
    bbox: [number, number, number, number],
    gridSize: number = 10
  ): Promise<Array<FloodRiskData>> {
    const [minLon, minLat, maxLon, maxLat] = bbox;

    const latStep = (maxLat - minLat) / gridSize;
    const lonStep = (maxLon - minLon) / gridSize;

    // Generate all coordinates
    const coordinates: Array<{ lat: number; lon: number }> = [];
    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const lat = minLat + i * latStep;
        const lon = minLon + j * lonStep;
        coordinates.push({ lat, lon });
      }
    }

    // Calculate risk for all points in parallel with batching to avoid overwhelming the API
    const batchSize = 5;
    const risks: Array<FloodRiskData> = [];

    for (let i = 0; i < coordinates.length; i += batchSize) {
      const batch = coordinates.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(({ lat, lon }) =>
          this.calculateFloodRisk(lat, lon).catch(err => {
            console.error(`Failed to calculate risk for ${lat}, ${lon}:`, err);
            return null;
          })
        )
      );

      risks.push(...batchResults.filter((r): r is FloodRiskData => r !== null));
    }

    return risks;
  }
}

export const floodRiskAPI = new FloodRiskAPI();
