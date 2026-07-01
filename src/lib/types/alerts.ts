/**
 * Early Warning Alert Types
 */

export type AlertType = 'flood' | 'drought';

export type AlertSeverity = 'warning' | 'critical';

export interface RiskAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  score: number; // 0-100 percentage
  threshold: number;
  message: string;
  location: {
    lat: number;
    lon: number;
    label?: string;
  };
  createdAt: string;
  acknowledged: boolean;
}

export interface AlertThresholds {
  flood: number; // 0-100 scale
  drought: number;
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  flood: 80,
  drought: 75,
};

export interface AlertEvaluationInput {
  lat: number;
  lon: number;
  floodScore: number; // 0-1 scale
  droughtScore: number; // 0-1 scale
  locationLabel?: string;
  userEmail?: string;
}
