'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { RiskAlert } from '@/lib/types/alerts';
import { useAuthStore } from '@/lib/store/auth-store';

interface UseEarlyWarningAlertsOptions {
  lat?: number | null;
  lon?: number | null;
  floodScore?: number;
  droughtScore?: number;
  locationLabel?: string;
  enabled?: boolean;
}

/**
 * Watches risk scores and triggers alert generation when thresholds are exceeded.
 */
export function useEarlyWarningAlerts({
  lat,
  lon,
  floodScore = 0,
  droughtScore = 0,
  locationLabel,
  enabled = true,
}: UseEarlyWarningAlertsOptions) {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const lastEvaluatedRef = useRef<string>('');
  const user = useAuthStore((s) => s.user);

  const evaluate = useCallback(async () => {
    if (!enabled || lat == null || lon == null) return;

    const key = `${lat.toFixed(4)},${lon.toFixed(4)},${floodScore.toFixed(2)},${droughtScore.toFixed(2)}`;
    if (lastEvaluatedRef.current === key) return;
    lastEvaluatedRef.current = key;

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lon,
          floodScore,
          droughtScore,
          locationLabel,
          userEmail: user?.email,
          user: user?.email || 'anonymous',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.alerts?.length > 0) {
          setAlerts((prev) => {
            const existingIds = new Set(prev.map((a) => a.id));
            const newOnes = (data.alerts as RiskAlert[]).filter((a) => !existingIds.has(a.id));
            return [...newOnes, ...prev];
          });
        }
      }
    } catch {
      // Non-blocking — risk display still works
    }
  }, [enabled, lat, lon, floodScore, droughtScore, locationLabel, user?.email]);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  const dismissAlert = useCallback(async (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge', alertId, user: user?.email }),
      });
    } catch {
      // Dismissed locally regardless
    }
  }, [user?.email]);

  return { alerts, dismissAlert };
}
