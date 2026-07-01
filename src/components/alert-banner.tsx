'use client';

import { AlertTriangle, Droplets, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RiskAlert } from '@/lib/types/alerts';
import { cn } from '@/lib/utils';

interface AlertBannerProps {
  alerts: RiskAlert[];
  onDismiss?: (alertId: string) => void;
  className?: string;
}

export function AlertBanner({ alerts, onDismiss, className }: AlertBannerProps) {
  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  if (activeAlerts.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          role="alert"
          className={cn(
            'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
            alert.severity === 'critical'
              ? 'border-destructive/50 bg-destructive/10 text-destructive'
              : 'border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
          )}
        >
          {alert.type === 'flood' ? (
            <Droplets className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold capitalize">
              {alert.severity === 'critical' ? 'Critical' : 'Warning'}:{' '}
              {alert.type} risk alert
            </p>
            <p className="text-xs mt-0.5 opacity-90">{alert.message}</p>
            <p className="text-xs mt-1 opacity-70">
              Score: {alert.score}% (threshold: {alert.threshold}%)
            </p>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={() => onDismiss(alert.id)}
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
