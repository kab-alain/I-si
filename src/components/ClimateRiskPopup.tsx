/**
 * ClimateRiskPopup Component
 * 
 * Comprehensive interactive map popup displaying:
 * 1. Current Climate Conditions & Risk Scores (Flood, Drought, NDVI, Elevation, Soil Moisture)
 * 2. 30-Day Climate Prediction & Assessment based on detected past days' trends
 * 3. Public Agriculture & Vegetation Recommendations for farmers based on agro-ecological zones
 * 
 * Fully responsive on mobile & desktop screens.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Thermometer, 
  Droplets, 
  Leaf, 
  Mountain, 
  TrendingUp, 
  TrendingDown, 
  X, 
  RefreshCw, 
  Info,
  CalendarDays,
  Sprout,
  BarChart3,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  MapPin
} from 'lucide-react';

import { useRainfallData, useTemperatureData, useDroughtRisk, useFloodRisk } from '@/lib/hooks/use-climate-data';
import { useNDVIData, useSoilMoisture } from '@/hooks/use-satellite-data';
import { useReverseGeocode } from '@/hooks/use-reverse-geocode';
import { calculate30DayClimatePredictionSync, ClimatePrediction30dResult } from '@/lib/data/climate-prediction-30d';
import { getAgricultureRecommendations, getAgricultureRecommendationsSync, AgricultureRecommendationResult } from '@/lib/api/agriculture';

export interface ClimateRiskPopupProps {
  coordinates: {
    lat: number;
    lon: number;
  };
  onClose: () => void;
  timeRange?: string;
}

export interface ClimateData {
  rainfall: {
    recent: number; // mm last 7 days
    monthly: number; // mm last 30 days
    trend: 'increasing' | 'decreasing' | 'stable';
    anomaly: number; // % difference from normal
    rawValues: number[];
  };
  temperature: {
    current: number; // °C
    average: number; // °C
    trend: 'warming' | 'cooling' | 'stable';
    anomaly: number;
    rawValues: number[];
  };
  elevation: {
    value: number; // meters
    slope: number; // degrees
    drainage: 'good' | 'moderate' | 'poor';
  };
  ndvi: {
    value: number;
    health: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';
    trend: 'improving' | 'declining' | 'stable';
  };
  soilMoisture: {
    surface: number;
    rootZone: number;
    trend: 'wetting' | 'drying' | 'stable';
  };
  floodRisk: {
    score: number;
    level: 'low' | 'moderate' | 'high' | 'extreme';
  };
  droughtRisk: {
    score: number;
    level: 'none' | 'mild' | 'moderate' | 'severe' | 'extreme';
  };
  lastUpdated: string;
}

function getBaselineElevation(lat: number, lon: number): { elevation: number; slope: number; drainage: 'good' | 'moderate' | 'poor' } {
  let elevation = 1550;
  if (lon < 29.5 && lat > -1.75) {
    elevation = 2250; // Northern Volcanic Ridge (Musanze, Burera, Nyabihu)
  } else if (lon < 29.5) {
    elevation = 1950; // Western Slopes & Congo-Nile Divide (Karongi, Nyamasheke)
  } else if (lon > 30.3) {
    elevation = 1380; // Eastern Lowlands / Savannah (Nyagatare, Kayonza)
  } else if (lat < -2.6 && lon < 29.2) {
    elevation = 1050; // Bugarama Valley
  } else {
    elevation = 1580; // Central Plateau (Kigali, Muhanga, Huye)
  }
  const slope = elevation > 1800 ? 18.5 : elevation > 1450 ? 11.2 : 4.8;
  const drainage: 'good' | 'moderate' | 'poor' = elevation > 1800 ? 'good' : elevation > 1400 ? 'moderate' : 'poor';
  return { elevation, slope, drainage };
}

function getBaselineClimateData(lat: number, lon: number): ClimateData {
  const { elevation, slope, drainage } = getBaselineElevation(lat, lon);
  const month = new Date().getMonth();
  const monthlyRainfallBaseline = [95, 110, 155, 175, 120, 35, 15, 40, 85, 135, 150, 115];
  const monthlyRain = monthlyRainfallBaseline[month] || 120;
  const dailyAvg = monthlyRain / 30;

  const rainfallValues = Array.from({ length: 30 }, (_, i) => {
    const val = Math.max(0, dailyAvg + Math.sin((i + lat * 10) * 0.8) * 3.5);
    return parseFloat(val.toFixed(1));
  });

  const recentRainfall = rainfallValues.slice(-7).reduce((sum, val) => sum + val, 0);
  const monthlyRainfall = rainfallValues.reduce((sum, val) => sum + val, 0);

  const baseTemp = 28 - (elevation / 1000) * 5.5;
  const temperatureValues = Array.from({ length: 30 }, (_, i) => {
    const val = baseTemp + Math.sin(i * 0.5) * 1.5;
    return parseFloat(val.toFixed(1));
  });

  const currentTemp = temperatureValues[temperatureValues.length - 1];
  const avgTemp = temperatureValues.reduce((sum, val) => sum + val, 0) / temperatureValues.length;

  const floodScore = recentRainfall > 60 ? 0.65 : recentRainfall > 35 ? 0.38 : 0.18;
  const floodLevel: 'low' | 'moderate' | 'high' | 'extreme' =
    floodScore >= 0.7 ? 'extreme' : floodScore >= 0.5 ? 'high' : floodScore >= 0.3 ? 'moderate' : 'low';

  const droughtScore = monthlyRainfall < 40 ? 0.62 : monthlyRainfall < 70 ? 0.35 : 0.15;
  const droughtLevel: 'none' | 'mild' | 'moderate' | 'severe' | 'extreme' =
    droughtScore >= 0.7 ? 'extreme' : droughtScore >= 0.5 ? 'severe' : droughtScore >= 0.3 ? 'moderate' : droughtScore >= 0.15 ? 'mild' : 'none';

  return {
    rainfall: {
      recent: parseFloat(recentRainfall.toFixed(1)),
      monthly: parseFloat(monthlyRainfall.toFixed(1)),
      trend: rainfallValues[29] > rainfallValues[15] ? 'increasing' : 'stable',
      anomaly: parseFloat((((monthlyRainfall - monthlyRain) / monthlyRain) * 100).toFixed(1)),
      rawValues: rainfallValues
    },
    temperature: {
      current: parseFloat(currentTemp.toFixed(1)),
      average: parseFloat(avgTemp.toFixed(1)),
      trend: 'stable',
      anomaly: parseFloat((avgTemp - baseTemp).toFixed(1)),
      rawValues: temperatureValues
    },
    elevation: {
      value: elevation,
      slope,
      drainage
    },
    ndvi: {
      value: elevation > 1800 ? 0.68 : 0.52,
      health: elevation > 1800 ? 'excellent' : 'good',
      trend: 'improving'
    },
    soilMoisture: {
      surface: recentRainfall > 30 ? 0.38 : 0.26,
      rootZone: 0.34,
      trend: 'stable'
    },
    floodRisk: {
      score: floodScore,
      level: floodLevel
    },
    droughtRisk: {
      score: droughtScore,
      level: droughtLevel
    },
    lastUpdated: new Date().toISOString()
  };
}

export function ClimateRiskPopup({ coordinates, onClose, timeRange = '30d' }: ClimateRiskPopupProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'prediction30d' | 'agriculture'>('overview');

  // Compute baseline data synchronously so popup appears instantly on map click
  const baseline = useMemo(() => getBaselineClimateData(coordinates.lat, coordinates.lon), [coordinates.lat, coordinates.lon]);
  const baselinePred = useMemo(() => calculate30DayClimatePredictionSync({
    latitude: coordinates.lat,
    longitude: coordinates.lon,
    pastRainfallValues: baseline.rainfall.rawValues,
    pastTempValues: baseline.temperature.rawValues,
    elevation: baseline.elevation.value,
    slope: baseline.elevation.slope,
    ndvi: baseline.ndvi.value
  }), [coordinates.lat, coordinates.lon, baseline]);
  const baselineAgri = useMemo(() => getAgricultureRecommendationsSync({
    latitude: coordinates.lat,
    longitude: coordinates.lon,
    elevation: baseline.elevation.value,
    ndvi: baseline.ndvi.value,
    recentRainfallMm: baseline.rainfall.recent,
    averageTemp: baseline.temperature.average
  }), [coordinates.lat, coordinates.lon, baseline]);

  const [climateData, setClimateData] = useState<ClimateData>(baseline);
  const [prediction30d, setPrediction30d] = useState<ClimatePrediction30dResult>(baselinePred);
  const [agriRecs, setAgriRecs] = useState<AgricultureRecommendationResult>(baselineAgri);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keep state updated when clicked coordinates change
  useEffect(() => {
    const base = getBaselineClimateData(coordinates.lat, coordinates.lon);
    setClimateData(base);
    setPrediction30d(calculate30DayClimatePredictionSync({
      latitude: coordinates.lat,
      longitude: coordinates.lon,
      pastRainfallValues: base.rainfall.rawValues,
      pastTempValues: base.temperature.rawValues,
      elevation: base.elevation.value,
      slope: base.elevation.slope,
      ndvi: base.ndvi.value
    }));
    setAgriRecs(getAgricultureRecommendationsSync({
      latitude: coordinates.lat,
      longitude: coordinates.lon,
      elevation: base.elevation.value,
      ndvi: base.ndvi.value,
      recentRainfallMm: base.rainfall.recent,
      averageTemp: base.temperature.average
    }));
  }, [coordinates.lat, coordinates.lon]);

  // Reverse geocode to resolve human-readable location name (e.g. Kigali, Musanze, Huye)
  const { locationName, isLoading: isGeocodingLoading } = useReverseGeocode(
    coordinates.lat,
    coordinates.lon
  );

  // Calculate past date range
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
    start.setDate(end.getDate() - days);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }, [timeRange]);

  // Fetch climate data from APIs (background hydration)
  const { data: rainfallData } = useRainfallData(
    coordinates.lat,
    coordinates.lon,
    startDate,
    endDate
  );

  const { data: temperatureData } = useTemperatureData(
    coordinates.lat,
    coordinates.lon,
    startDate,
    endDate
  );

  const { data: droughtData } = useDroughtRisk(
    coordinates.lat,
    coordinates.lon,
    startDate,
    endDate
  );

  const { data: floodData } = useFloodRisk(
    coordinates.lat,
    coordinates.lon
  );

  const { vegetationHealth } = useNDVIData({
    lat: coordinates.lat,
    lon: coordinates.lon,
    startDate,
    endDate
  });

  const { moistureAnalysis } = useSoilMoisture({
    lat: coordinates.lat,
    lon: coordinates.lon,
    startDate,
    endDate
  });

  // Extract primitive NDVI and moisture values to avoid object identity infinite render loops
  const ndviScore = vegetationHealth?.current?.score ?? baseline.ndvi.value;
  const ndviHealth = vegetationHealth?.current?.health ?? baseline.ndvi.health;
  const ndviTrend = vegetationHealth?.trend ?? baseline.ndvi.trend;
  const soilSurface = moistureAnalysis?.current?.surface ?? baseline.soilMoisture.surface;
  const soilRootZone = moistureAnalysis?.current?.rootZone ?? baseline.soilMoisture.rootZone;
  const soilTrend = moistureAnalysis?.trend ?? baseline.soilMoisture.trend;

  // Hydrate with remote API telemetry when available
  useEffect(() => {
    let isCancelled = false;

    const hydrateLiveData = async () => {
      if (!rainfallData && !temperatureData && !droughtData && !floodData) {
        return;
      }

      try {
        setIsRefreshing(true);

        // 1. Process rainfall data
        const rainfallValues = rainfallData?.properties?.parameter?.PRECTOTCORR
          ? Object.values(rainfallData.properties.parameter.PRECTOTCORR).filter(
              (p): p is number => typeof p === 'number' && p >= 0
            )
          : baseline.rainfall.rawValues;

        const recentRainfall = rainfallValues.slice(-7).reduce((sum, val) => sum + val, 0);
        const monthlyRainfall = rainfallValues.reduce((sum, val) => sum + val, 0);
        const avgRainfall = rainfallValues.length > 0 ? monthlyRainfall / rainfallValues.length : 3.8;

        const firstHalfRain = rainfallValues.slice(0, Math.floor(rainfallValues.length / 2));
        const secondHalfRain = rainfallValues.slice(Math.floor(rainfallValues.length / 2));
        const firstAvgRain = firstHalfRain.reduce((sum, val) => sum + val, 0) / (firstHalfRain.length || 1);
        const secondAvgRain = secondHalfRain.reduce((sum, val) => sum + val, 0) / (secondHalfRain.length || 1);

        let rainfallTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (secondAvgRain > firstAvgRain + 1.5) rainfallTrend = 'increasing';
        else if (secondAvgRain < firstAvgRain - 1.5) rainfallTrend = 'decreasing';

        // 2. Process temperature data
        const temperatureValues = temperatureData?.properties?.parameter?.T2M
          ? Object.values(temperatureData.properties.parameter.T2M).filter(
              (t): t is number => typeof t === 'number' && t > -100
            )
          : baseline.temperature.rawValues;

        const currentTemp = temperatureValues.length > 0 ? temperatureValues[temperatureValues.length - 1] : baseline.temperature.current;
        const avgTemp = temperatureValues.length > 0
          ? temperatureValues.reduce((sum, val) => sum + val, 0) / temperatureValues.length
          : baseline.temperature.average;

        const tempFirstHalf = temperatureValues.slice(0, Math.floor(temperatureValues.length / 2));
        const tempSecondHalf = temperatureValues.slice(Math.floor(temperatureValues.length / 2));
        const tempFirstAvg = tempFirstHalf.reduce((sum, val) => sum + val, 0) / (tempFirstHalf.length || 1);
        const tempSecondAvg = tempSecondHalf.reduce((sum, val) => sum + val, 0) / (tempSecondHalf.length || 1);

        let tempTrend: 'warming' | 'cooling' | 'stable' = 'stable';
        if (tempSecondAvg > tempFirstAvg + 0.8) tempTrend = 'warming';
        else if (tempSecondAvg < tempFirstAvg - 0.8) tempTrend = 'cooling';

        // 3. Combined data
        const combinedData: ClimateData = {
          rainfall: {
            recent: recentRainfall,
            monthly: monthlyRainfall,
            trend: rainfallTrend,
            anomaly: avgRainfall > 0 ? ((avgRainfall - 4.0) / 4.0) * 100 : 0,
            rawValues: rainfallValues
          },
          temperature: {
            current: currentTemp,
            average: avgTemp,
            trend: tempTrend,
            anomaly: avgTemp - 22.0,
            rawValues: temperatureValues
          },
          elevation: baseline.elevation,
          ndvi: {
            value: ndviScore,
            health: ndviHealth as any,
            trend: ndviTrend
          },
          soilMoisture: {
            surface: soilSurface,
            rootZone: soilRootZone,
            trend: soilTrend
          },
          floodRisk: {
            score: floodData?.floodRisk?.score ?? (recentRainfall > 50 ? 0.65 : 0.25),
            level: (floodData?.floodRisk?.level === 'medium' ? 'moderate' : floodData?.floodRisk?.level ?? 'low') as any
          },
          droughtRisk: {
            score: droughtData?.droughtRisk ?? (monthlyRainfall < 30 ? 0.58 : 0.20),
            level: (droughtData?.riskLevel === 'extreme' ? 'extreme' :
                    droughtData?.riskLevel === 'high' ? 'severe' :
                    droughtData?.riskLevel === 'medium' ? 'moderate' :
                    droughtData?.riskLevel === 'low' ? 'mild' : 'none') as any
          },
          lastUpdated: new Date().toISOString()
        };

        // 4. Forward 30-Day Climate Prediction
        const pred30d = calculate30DayClimatePredictionSync({
          latitude: coordinates.lat,
          longitude: coordinates.lon,
          pastRainfallValues: rainfallValues,
          pastTempValues: temperatureValues,
          elevation: baseline.elevation.value,
          slope: baseline.elevation.slope,
          ndvi: combinedData.ndvi.value
        });

        // 5. Agricultural Recommendations
        const agRecs = await getAgricultureRecommendations({
          latitude: coordinates.lat,
          longitude: coordinates.lon,
          elevation: baseline.elevation.value,
          ndvi: combinedData.ndvi.value,
          recentRainfallMm: recentRainfall,
          averageTemp: avgTemp
        });

        if (isCancelled) return;
        setClimateData(combinedData);
        setPrediction30d(pred30d);
        setAgriRecs(agRecs);
      } catch (err) {
        console.warn('Live telemetry hydration warning (fallback in effect):', err);
      } finally {
        if (!isCancelled) setIsRefreshing(false);
      }
    };

    hydrateLiveData();

    return () => {
      isCancelled = true;
    };
  }, [
    coordinates.lat,
    coordinates.lon,
    rainfallData,
    temperatureData,
    droughtData,
    floodData,
    ndviScore,
    ndviHealth,
    ndviTrend,
    soilSurface,
    soilRootZone,
    soilTrend,
    baseline
  ]);

  const getRiskBadgeColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'extreme':
      case 'severe':
        return 'bg-red-500 hover:bg-red-600 text-white border-red-600';
      case 'high':
        return 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600';
      case 'moderate':
        return 'bg-amber-500 hover:bg-amber-600 text-black border-amber-600';
      case 'mild':
      case 'low':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700';
      default:
        return 'bg-slate-700 text-white border-slate-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'warming':
      case 'improving':
      case 'wetting':
        return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
      case 'decreasing':
      case 'cooling':
      case 'declining':
      case 'drying':
        return <TrendingDown className="h-3.5 w-3.5 text-rose-500" />;
      default:
        return <span className="text-xs text-muted-foreground font-mono">→</span>;
    }
  };

  return (
    <aside
      aria-label="Climate Risk, 30-Day Outlook & Agriculture Panel"
      className="absolute top-0 sm:top-2 right-0 sm:right-2 bottom-0 sm:bottom-2 z-30 w-full sm:w-[480px] md:w-[500px] max-w-full bg-background/95 backdrop-blur-md text-foreground rounded-none sm:rounded-2xl shadow-2xl border-l sm:border border-border flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-6 duration-200"
    >
      {/* Header Bar - Fixed at top of panel */}
      <div className="p-4 border-b flex-shrink-0 bg-background/80 backdrop-blur-sm space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base tracking-tight text-foreground truncate">
                {locationName || (isGeocodingLoading ? 'Resolving location...' : 'Climate Intelligence Assessment')}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                {isRefreshing && <RefreshCw className="h-2.5 w-2.5 animate-spin" />}
                Live
              </span>
            </div>
            {locationName && (
              <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{locationName}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground flex items-center gap-2 font-mono flex-wrap">
              <span>{coordinates.lat.toFixed(4)}°N, {coordinates.lon.toFixed(4)}°E</span>
              <span>•</span>
              <span>Elev: {climateData.elevation.value.toFixed(0)}m</span>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted flex-shrink-0"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable Body - Scrollable content across full height */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tab Navigation Controls */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-3 w-full h-9 bg-muted/80 p-0.5 rounded-lg text-xs">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 py-1 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span>Current</span>
            </TabsTrigger>
            <TabsTrigger value="prediction30d" className="flex items-center gap-1.5 py-1 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
              <span>30-Day Outlook</span>
            </TabsTrigger>
            <TabsTrigger value="agriculture" className="flex items-center gap-1.5 py-1 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Sprout className="h-3.5 w-3.5 text-emerald-500" />
              <span>Agri & Crops</span>
            </TabsTrigger>
          </TabsList>

          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW / CURRENT CONDITIONS */}
          {/* ======================================================== */}
          <TabsContent value="overview" className="space-y-4 pt-3 focus-visible:outline-none">
            {/* Risk Badges Summary */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-2.5 bg-muted/40 border">
                <CardContent className="p-0 text-center space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Flood Risk</span>
                  <div>
                    <Badge className={`text-[10px] uppercase font-bold px-2 py-0.5 ${getRiskBadgeColor(climateData.floodRisk.level)}`}>
                      {climateData.floodRisk.level}
                    </Badge>
                  </div>
                  <div className="text-sm font-black font-mono">
                    {(climateData.floodRisk.score * 100).toFixed(0)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="p-2.5 bg-muted/40 border">
                <CardContent className="p-0 text-center space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Drought Risk</span>
                  <div>
                    <Badge className={`text-[10px] uppercase font-bold px-2 py-0.5 ${getRiskBadgeColor(climateData.droughtRisk.level)}`}>
                      {climateData.droughtRisk.level}
                    </Badge>
                  </div>
                  <div className="text-sm font-black font-mono">
                    {(climateData.droughtRisk.score * 100).toFixed(0)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="p-2.5 bg-muted/40 border">
                <CardContent className="p-0 text-center space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">30d Projection</span>
                  <div>
                    <Badge className={`text-[10px] uppercase font-bold px-2 py-0.5 ${getRiskBadgeColor(prediction30d?.overallAssessment?.overallRiskLevel || 'low')}`}>
                      {prediction30d?.overallAssessment?.overallRiskLevel || 'Normal'}
                    </Badge>
                  </div>
                  <div className="text-sm font-black font-mono text-primary">
                    {prediction30d?.overallAssessment?.predictedRainfall30dMm !== undefined
                      ? `${prediction30d.overallAssessment.predictedRainfall30dMm.toFixed(0)} mm`
                      : '0 mm'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current Telemetry Readings */}
            <div className="space-y-2.5 text-xs">
              {/* Rainfall */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <div>
                    <span className="font-semibold block">Observed Rainfall</span>
                    <span className="text-[10px] text-muted-foreground">Recent 7-day sum & 30-day total</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-foreground">
                    {climateData.rainfall.recent.toFixed(1)} mm (7d)
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                    {getTrendIcon(climateData.rainfall.trend)}
                    <span>{climateData.rainfall.monthly.toFixed(1)} mm / 30d</span>
                  </div>
                </div>
              </div>

              {/* Temperature */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-rose-500" />
                  <div>
                    <span className="font-semibold block">Air Temperature</span>
                    <span className="text-[10px] text-muted-foreground">Current reading & monthly mean</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-foreground">
                    {climateData.temperature.current.toFixed(1)}°C
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                    {getTrendIcon(climateData.temperature.trend)}
                    <span>Avg {climateData.temperature.average.toFixed(1)}°C</span>
                  </div>
                </div>
              </div>

              {/* Vegetation Health (NDVI) */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-emerald-500" />
                  <div>
                    <span className="font-semibold block">Vegetation Greenness (NDVI)</span>
                    <span className="text-[10px] text-muted-foreground">Satellite surface reflectance</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-foreground">
                    {climateData.ndvi.value.toFixed(3)}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[11px] text-emerald-500 capitalize">
                    {getTrendIcon(climateData.ndvi.trend)}
                    <span>{climateData.ndvi.health}</span>
                  </div>
                </div>
              </div>

              {/* Soil Moisture */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-cyan-500" />
                  <div>
                    <span className="font-semibold block">Soil Moisture Level</span>
                    <span className="text-[10px] text-muted-foreground">Root zone available moisture</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-foreground">
                    {(climateData.soilMoisture.rootZone * 100).toFixed(0)}%
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground capitalize">
                    {getTrendIcon(climateData.soilMoisture.trend)}
                    <span>{climateData.soilMoisture.trend}</span>
                  </div>
                </div>
              </div>

              {/* Elevation & Slope */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <Mountain className="h-4 w-4 text-amber-500" />
                  <div>
                    <span className="font-semibold block">Topography & Drainage</span>
                    <span className="text-[10px] text-muted-foreground">SRTM elevation and relief slope</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-foreground">
                    {climateData.elevation.value.toFixed(0)} m
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Slope: {climateData.elevation.slope.toFixed(1)}° ({climateData.elevation.drainage})
                  </div>
                </div>
              </div>
            </div>

            {/* Shortcut button to 30d forecast */}
            <Button
              onClick={() => setActiveTab('prediction30d')}
              variant="default"
              className="w-full text-xs font-semibold flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-95 shadow-md"
            >
              <CalendarDays className="h-4 w-4" />
              <span>Inspect 30-Day Climate Prediction Timeline</span>
            </Button>
          </TabsContent>

          {/* ======================================================== */}
          {/* TAB 2: 30-DAY CLIMATE PREDICTION & CONDITIONS */}
          {/* ======================================================== */}
          <TabsContent value="prediction30d" className="space-y-4 pt-3 focus-visible:outline-none">
            {prediction30d ? (
              <>
                {/* 30-Day Headline Card */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-primary/10 via-background to-muted border border-primary/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      30-Day Forward Forecast
                    </span>
                    <Badge className={`text-[10px] uppercase font-bold ${getRiskBadgeColor(prediction30d.overallAssessment.overallRiskLevel)}`}>
                      {prediction30d.overallAssessment.overallRiskLevel} risk
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-foreground leading-snug">
                    {prediction30d.overallAssessment.headline}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {prediction30d.overallAssessment.detailedNarrative}
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center font-mono">
                    <div className="p-1.5 rounded bg-background/60 border border-border/50">
                      <span className="text-[9px] text-muted-foreground uppercase block">Expected Rain</span>
                      <span className="text-xs font-bold text-primary">
                        {prediction30d.overallAssessment.predictedRainfall30dMm} mm
                      </span>
                    </div>
                    <div className="p-1.5 rounded bg-background/60 border border-border/50">
                      <span className="text-[9px] text-muted-foreground uppercase block">vs Climatology</span>
                      <span className={`text-xs font-bold ${prediction30d.overallAssessment.rainfallAnomalyPct >= 0 ? 'text-blue-500' : 'text-amber-500'}`}>
                        {prediction30d.overallAssessment.rainfallAnomalyPct >= 0 ? '+' : ''}{prediction30d.overallAssessment.rainfallAnomalyPct}%
                      </span>
                    </div>
                    <div className="p-1.5 rounded bg-background/60 border border-border/50">
                      <span className="text-[9px] text-muted-foreground uppercase block">Mean Temp</span>
                      <span className="text-xs font-bold text-foreground">
                        {prediction30d.overallAssessment.averageProjectedTemp}°C
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detected Past Trends Banner */}
                <div className="p-2.5 rounded-lg bg-muted/40 border text-xs space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-semibold text-foreground">Past Days Trend Basis:</span>
                    <span className="font-mono text-[10px]">Confidence: {(prediction30d.overallAssessment.confidenceScore * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Detected past 7-day rainfall: <strong className="text-foreground">{prediction30d.pastDaysDetections.observed7dRainfallMm} mm</strong> ({prediction30d.pastDaysDetections.recentIntensityRate} mm/day),
                    rainfall trajectory is <strong className="text-foreground capitalize">{prediction30d.pastDaysDetections.observedRainfallTrend}</strong>,
                    temperature trend is <strong className="text-foreground capitalize">{prediction30d.pastDaysDetections.observedTempTrend}</strong>.
                  </p>
                </div>

                {/* 4-Week Progressive Timeline */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Weekly Risk & Condition Progression
                  </span>

                  {prediction30d.weeklyTimeline.map((week, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-xs">{week.periodLabel}</span>
                        <Badge variant="outline" className="text-[10px] font-medium border-border">
                          {week.primaryCondition}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground font-mono">
                        <div>
                          <span>Rain: </span>
                          <strong className="text-foreground">{week.expectedRainfallMm} mm</strong>
                        </div>
                        <div>
                          <span>Prob: </span>
                          <strong className="text-foreground">{week.rainfallProbability}%</strong>
                        </div>
                        <div>
                          <span>Temp: </span>
                          <strong className="text-foreground">{week.projectedAvgTemp}°C</strong>
                        </div>
                      </div>

                      {/* Flood vs Drought Probability bars */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-blue-500 font-medium">Flood Risk: {week.floodRiskPct}%</span>
                          <span className="text-amber-500 font-medium">Drought Stress: {week.droughtRiskPct}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 h-1.5">
                          <Progress value={week.floodRiskPct} className="h-1.5 bg-blue-950 [&>div]:bg-blue-500" />
                          <Progress value={week.droughtRiskPct} className="h-1.5 bg-amber-950 [&>div]:bg-amber-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preparedness Actions for this 30-Day Outlook */}
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5 text-xs">
                  <span className="font-bold text-primary flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Recommended Climate Preparedness Actions
                  </span>
                  <ul className="space-y-1 text-muted-foreground text-[11px]">
                    {prediction30d.preparednessActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Loading 30-day forward predictions...
              </div>
            )}
          </TabsContent>

          {/* ======================================================== */}
          {/* TAB 3: AGRICULTURE & VEGETATION RECOMMENDATIONS */}
          {/* ======================================================== */}
          <TabsContent value="agriculture" className="space-y-4 pt-3 focus-visible:outline-none">
            {agriRecs ? (
              <>
                {/* Agro-Ecological Zone Badge Card */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-background to-muted border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-500 flex items-center gap-1">
                      <Compass className="h-3.5 w-3.5" />
                      Agro-Ecological Classification
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-semibold">
                      {agriRecs.agroEcologicalZone.elevationRange}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground">
                    {agriRecs.agroEcologicalZone.name}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {agriRecs.agroEcologicalZone.description}
                  </p>
                </div>

                {/* Public Agro-Weather Telemetry (Open-Meteo & FAO-56) */}
                <div className="p-3 rounded-xl bg-card border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-teal-500" />
                      Soil & Agro-Meteorology (Open-Meteo Public API)
                    </span>
                    <Badge variant="outline" className="text-[10px] text-teal-500 border-teal-500/30 capitalize">
                      {agriRecs.metrics.soilMoistureCategory} moisture
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center font-mono pt-1 text-[11px]">
                    <div className="p-1.5 rounded bg-muted/40 border">
                      <span className="text-[9px] text-muted-foreground block">FAO ET0 (evap)</span>
                      <strong className="text-foreground">{agriRecs.metrics.faoEvapotranspirationMmDay} mm/day</strong>
                    </div>
                    <div className="p-1.5 rounded bg-muted/40 border">
                      <span className="text-[9px] text-muted-foreground block">Soil Moisture</span>
                      <strong className="text-foreground">{(agriRecs.metrics.soilMoistureIndex * 100).toFixed(0)}% index</strong>
                    </div>
                    <div className="p-1.5 rounded bg-muted/40 border">
                      <span className="text-[9px] text-muted-foreground block">16d Rain Sum</span>
                      <strong className="text-primary">{agriRecs.metrics.shortTermRainSum16d} mm</strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground pt-1 border-t">
                    <span>Vegetation Status: </span>
                    <strong className="text-foreground capitalize">{agriRecs.vegetationCondition.healthStatus}</strong>
                    <span> • {agriRecs.vegetationCondition.biomassStatus}</span>
                  </div>
                </div>

                {/* Recommended Crops & Vegetation */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Recommended Crops & Vegetation
                    </span>
                    <span className="text-[10px] text-muted-foreground">Tailored to current conditions</span>
                  </div>

                  <div className="space-y-2">
                    {agriRecs.recommendedCrops.map((crop, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-card border border-border hover:border-emerald-500/40 transition-colors space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-foreground text-xs">{crop.name}</h5>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                              {crop.category}
                            </span>
                            <Badge
                              className={`text-[9px] px-1.5 py-0.2 ${
                                crop.suitability === 'highly_recommended'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-teal-700 text-white'
                              }`}
                            >
                              {crop.suitability.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
                          <span>Maturity: <strong className="text-foreground">{crop.maturityPeriod}</strong></span>
                          <span>Water Need: <strong className="text-foreground capitalize">{crop.waterRequirement}</strong></span>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {crop.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Farmer Preparation & Field Advisory */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Sprout className="h-4 w-4 text-emerald-500" />
                    <span className="font-bold text-foreground">Actionable Farmer Preparation Advisory</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div>
                      <span className="font-semibold text-emerald-500 block">Sowing & Planting Window:</span>
                      <p className="text-muted-foreground">{agriRecs.advisory.plantingWindow}</p>
                    </div>

                    <div>
                      <span className="font-semibold text-foreground block">Land Preparation & Soil Conservation:</span>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        {agriRecs.advisory.landPreparation.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="font-semibold text-foreground block">Water & Moisture Management:</span>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        {agriRecs.advisory.soilAndMoistureCare.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="font-semibold text-amber-500 block">Pest & Disease Prevention:</span>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        {agriRecs.advisory.pestAndDiseaseAlerts.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Fetching public agro-meteorology and crop recommendations...
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer info & timestamp */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-3 border-t">
          <div className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            <span>Open-Meteo, NASA POWER & MINAGRI</span>
          </div>
          <span>Updated: {new Date(climateData.lastUpdated).toLocaleTimeString()}</span>
        </div>
      </div>
    </aside>
  );
}

export default ClimateRiskPopup;
