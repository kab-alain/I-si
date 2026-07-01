'use client';

import { AlertTriangle } from 'lucide-react';
import type { ValidationWarning } from '@/lib/validation/climate-data';

interface ValidationWarningBannerProps {
  warnings: ValidationWarning[];
  className?: string;
}

export function ValidationWarningBanner({ warnings, className }: ValidationWarningBannerProps) {
  if (warnings.length === 0) return null;

  return (
    <div
      className={`rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm ${className ?? ''}`}
      role="status"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Some data was unavailable
          </p>
          <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
