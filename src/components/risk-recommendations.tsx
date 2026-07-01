'use client';

import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getCombinedRecommendations,
  getRecommendations,
  type RiskCategory,
} from '@/lib/recommendations/risk-recommendations';

interface RiskRecommendationsProps {
  floodLevel: string;
  droughtLevel: string;
  /** Show only one category, or 'all' for combined view */
  category?: RiskCategory | 'all';
  compact?: boolean;
}

export function RiskRecommendations({
  floodLevel,
  droughtLevel,
  category = 'all',
  compact = false,
}: RiskRecommendationsProps) {
  const combined = getCombinedRecommendations(floodLevel, droughtLevel);

  const sections =
    category === 'all'
      ? [
          { title: 'Flood Risk', items: combined.flood, show: floodLevel !== 'low' && floodLevel !== 'unknown' },
          { title: 'Drought Risk', items: combined.drought, show: droughtLevel !== 'low' && droughtLevel !== 'unknown' },
          { title: 'General Guidance', items: combined.overall, show: true },
        ].filter((s) => s.show && s.items.length > 0)
      : [{ title: `${category} Recommendations`, items: getRecommendations(category, category === 'flood' ? floodLevel : droughtLevel), show: true }];

  if (sections.length === 0) return null;

  if (compact) {
    const items = sections[0]?.items.slice(0, 3) ?? [];
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Lightbulb className="h-3 w-3" />
          Recommendations
        </div>
        <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Decision Support Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {section.title}
            </h4>
            <ul className="text-sm space-y-1.5">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
