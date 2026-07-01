/**
 * Early Warning Alert Engine
 * Evaluates flood/drought scores against configurable thresholds.
 */

import type {
  AlertEvaluationInput,
  AlertThresholds,
  RiskAlert,
} from '@/lib/types/alerts';
import { DEFAULT_ALERT_THRESHOLDS } from '@/lib/types/alerts';

function scoreToPercent(score: number): number {
  // Accept both 0-1 and 0-100 scales
  return score <= 1 ? Math.round(score * 100) : Math.round(score);
}

function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Evaluate risk scores and generate alert objects when thresholds are exceeded.
 */
export function evaluateRiskAlerts(
  input: AlertEvaluationInput,
  thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS
): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const floodPercent = scoreToPercent(input.floodScore);
  const droughtPercent = scoreToPercent(input.droughtScore);
  const now = new Date().toISOString();

  if (floodPercent > thresholds.flood) {
    alerts.push({
      id: generateAlertId(),
      type: 'flood',
      severity: floodPercent >= 90 ? 'critical' : 'warning',
      score: floodPercent,
      threshold: thresholds.flood,
      message: `High flood risk detected (${floodPercent}%) at ${input.locationLabel ?? `${input.lat.toFixed(4)}, ${input.lon.toFixed(4)}`}. Threshold: ${thresholds.flood}%.`,
      location: {
        lat: input.lat,
        lon: input.lon,
        label: input.locationLabel,
      },
      createdAt: now,
      acknowledged: false,
    });
  }

  if (droughtPercent > thresholds.drought) {
    alerts.push({
      id: generateAlertId(),
      type: 'drought',
      severity: droughtPercent >= 90 ? 'critical' : 'warning',
      score: droughtPercent,
      threshold: thresholds.drought,
      message: `High drought risk detected (${droughtPercent}%) at ${input.locationLabel ?? `${input.lat.toFixed(4)}, ${input.lon.toFixed(4)}`}. Threshold: ${thresholds.drought}%.`,
      location: {
        lat: input.lat,
        lon: input.lon,
        label: input.locationLabel,
      },
      createdAt: now,
      acknowledged: false,
    });
  }

  return alerts;
}
