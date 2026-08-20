import { useQuery } from '@tanstack/react-query';
import { nasaPowerAPI } from '@/lib/api/nasa-power';
import { format, subDays } from 'date-fns';
import { validateClimateInputs } from '@/lib/validation/climate-data';
import type { ValidationWarning } from '@/lib/validation/climate-data';

export interface DroughtRiskData {
  coordinates: {
    lat: number;
    lon: number;
  };
  riskScore: number; // 0-1 scale
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  factors: {
    precipitation: {
      recent: number;
      historical: number;
      anomaly: number;
    };
    temperature: {
      current: number;
      anomaly: number;
    };
    spi: number;
  };
  timestamp: Date;
  validationWarnings?: ValidationWarning[];
}

/**
 * Calculate drought risk index based on precipitation deficit and temperature anomaly
 */
export function useDroughtRisk(
  lat: number,
  lon: number,
  enabled: boolean = true
) {
  return useQuery<DroughtRiskData>({
    queryKey: ['drought-risk', lat, lon],
    queryFn: async () => {
      const validationWarnings: ValidationWarning[] = [];
      const validated = validateClimateInputs(lat, lon);
      validationWarnings.push(...validated.warnings);
      lat = validated.coordinates.lat;
      lon = validated.coordinates.lon;

      try {
        // NASA POWER has ~2-5 day data lag — cap end date to avoid empty responses
        const endDate = subDays(new Date(), 5);
        const startDate30 = subDays(endDate, 30);
        const startDate90 = subDays(endDate, 90);

        let recentRainfallData = null;
        let historicalRainfallData = null;
        let temperatureData = null;

        try {
          [recentRainfallData, historicalRainfallData, temperatureData] = await Promise.all([
            nasaPowerAPI.getRainfallData(lat, lon, format(startDate30, 'yyyyMMdd'), format(endDate, 'yyyyMMdd')),
            nasaPowerAPI.getRainfallData(lat, lon, format(startDate90, 'yyyyMMdd'), format(startDate30, 'yyyyMMdd')),
            nasaPowerAPI.getTemperatureData(lat, lon, format(startDate30, 'yyyyMMdd'), format(endDate, 'yyyyMMdd')),
          ]);
        } catch (fetchError) {
          console.warn('Drought risk: API fetch partial failure, using fallbacks', fetchError);
        }

        const recentPrecipValues = recentRainfallData?.properties?.parameter?.PRECTOTCORR
          ? Object.values(recentRainfallData.properties.parameter.PRECTOTCORR).filter(
              (p): p is number => typeof p === 'number' && p >= 0
            )
          : [];

        let recentPrecip: number;
        if (recentPrecipValues.length === 0) {
          const rainFallback = validateClimateInputs(lat, lon, undefined);
          validationWarnings.push(...rainFallback.warnings.filter((w) => w.field === 'rainfall'));
          recentPrecip = rainFallback.rainfall * 30;
        } else {
          recentPrecip = recentPrecipValues.reduce((sum, val) => sum + val, 0);
        }

        const historicalPrecipValues = historicalRainfallData?.properties?.parameter?.PRECTOTCORR
          ? Object.values(historicalRainfallData.properties.parameter.PRECTOTCORR).filter(
              (p): p is number => typeof p === 'number' && p >= 0
            )
          : [];
        const historicalPrecip = historicalPrecipValues.reduce((sum, val) => sum + val, 0);
        const historicalAvg = historicalPrecipValues.length > 0
          ? historicalPrecip / historicalPrecipValues.length
          : validated.rainfall;

        const expectedPrecip = historicalAvg * 30;
        const precipAnomaly = expectedPrecip > 0
          ? (recentPrecip - expectedPrecip) / expectedPrecip
          : 0;

        const temps = temperatureData?.properties?.parameter?.T2M
          ? Object.values(temperatureData.properties.parameter.T2M).filter(
              (t): t is number => typeof t === 'number' && t > -100
            )
          : [];

        let avgTemp: number;
        if (temps.length === 0) {
          const tempFallback = validateClimateInputs(lat, lon, undefined, undefined);
          validationWarnings.push(...tempFallback.warnings.filter((w) => w.field === 'temperature'));
          avgTemp = tempFallback.temperature;
        } else {
          avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
        }

        const normalTemp = 22.5;
        const tempAnomaly = avgTemp - normalTemp;
        const spi = precipAnomaly;

        let riskScore = 0;

        if (precipAnomaly < -0.7) riskScore += 0.6;
        else if (precipAnomaly < -0.5) riskScore += 0.48;
        else if (precipAnomaly < -0.3) riskScore += 0.36;
        else if (precipAnomaly < -0.15) riskScore += 0.24;
        else if (precipAnomaly < -0.05) riskScore += 0.12;

        if (tempAnomaly > 4) riskScore += 0.25;
        else if (tempAnomaly > 3) riskScore += 0.20;
        else if (tempAnomaly > 2) riskScore += 0.15;
        else if (tempAnomaly > 1) riskScore += 0.10;
        else if (tempAnomaly > 0.5) riskScore += 0.05;

        if (recentPrecip < 20) riskScore += 0.15;
        else if (recentPrecip < 40) riskScore += 0.12;
        else if (recentPrecip < 60) riskScore += 0.09;
        else if (recentPrecip < 80) riskScore += 0.06;
        else if (recentPrecip < 100) riskScore += 0.03;

        riskScore = Math.min(1, riskScore);

        let riskLevel: 'low' | 'medium' | 'high' | 'extreme';
        if (riskScore >= 0.75) riskLevel = 'extreme';
        else if (riskScore >= 0.5) riskLevel = 'high';
        else if (riskScore >= 0.25) riskLevel = 'medium';
        else riskLevel = 'low';

        return {
          coordinates: { lat, lon },
          riskScore,
          riskLevel,
          factors: {
            precipitation: { recent: recentPrecip, historical: expectedPrecip, anomaly: precipAnomaly },
            temperature: { current: avgTemp, anomaly: tempAnomaly },
            spi,
          },
          timestamp: new Date(),
          validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined,
        };
      } catch (error) {
        console.error('Drought risk calculation error:', error);
        const fallback = validateClimateInputs(lat, lon);
        return {
          coordinates: fallback.coordinates,
          riskScore: 0.25,
          riskLevel: 'medium' as const,
          factors: {
            precipitation: { recent: 60, historical: 80, anomaly: -0.1 },
            temperature: { current: fallback.temperature, anomaly: 0 },
            spi: -0.1,
          },
          timestamp: new Date(),
          validationWarnings: [
            ...fallback.warnings,
            { field: 'calculation', message: 'Drought calculation encountered an error. Showing estimated values.', usedFallback: true },
          ],
        };
      }
    },
    enabled: enabled && !!lat && !!lon,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
  });
}
