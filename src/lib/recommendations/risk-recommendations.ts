/**
 * Decision Support — static recommendation mappings by risk type and level.
 * No AI; practical guidance for each calculated risk level.
 */

export type RiskCategory = 'flood' | 'drought' | 'overall';
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

const FLOOD_RECOMMENDATIONS: Record<RiskLevel, string[]> = {
  low: [
    'Continue routine monitoring of local weather forecasts.',
    'Maintain standard drainage and water management practices.',
    'Keep emergency supplies accessible as a precaution.',
  ],
  medium: [
    'Monitor rainfall forecasts and river levels closely.',
    'Clear debris from drains and gutters near your property.',
    'Avoid parking in low-lying or flood-prone areas.',
    'Review your household emergency plan.',
  ],
  high: [
    'Avoid flood-prone roads and low-lying areas.',
    'Notify local authorities of rising water levels.',
    'Monitor rainfall closely and stay tuned to weather alerts.',
    'Prepare evacuation routes if conditions worsen.',
    'Move valuables and vehicles to higher ground.',
  ],
  extreme: [
    'Evacuate flood-prone areas immediately if instructed.',
    'Do not attempt to cross flooded roads or bridges.',
    'Contact emergency services and local disaster management.',
    'Shelter in place on upper floors if evacuation is not possible.',
    'Avoid contact with floodwater — it may be contaminated.',
  ],
};

const DROUGHT_RECOMMENDATIONS: Record<RiskLevel, string[]> = {
  low: [
    'Maintain normal water conservation habits.',
    'Monitor seasonal rainfall patterns.',
    'Support community water resource planning.',
  ],
  medium: [
    'Reduce non-essential water usage.',
    'Protect soil moisture with mulching or cover crops.',
    'Monitor crop and livestock water needs.',
    'Check local water restrictions and advisories.',
  ],
  high: [
    'Implement strict water rationing for agriculture and domestic use.',
    'Prioritize drinking water for humans and livestock.',
    'Report dry wells or water shortages to local authorities.',
    'Consider drought-resistant crop alternatives.',
    'Avoid outdoor burning — increased fire risk.',
  ],
  extreme: [
    'Activate emergency drought response plans.',
    'Coordinate with government agencies for water distribution.',
    'Suspend non-essential irrigation immediately.',
    'Relocate livestock to areas with reliable water sources.',
    'Prepare for potential food supply disruptions.',
  ],
};

const OVERALL_RECOMMENDATIONS: Record<RiskLevel, string[]> = {
  low: [
    'Conditions are generally stable. Continue regular monitoring.',
    'Stay informed through local climate updates.',
  ],
  medium: [
    'Review both flood and drought preparedness plans.',
    'Monitor climate indicators weekly.',
    'Engage with community early warning systems.',
  ],
  high: [
    'Increase monitoring frequency for all climate indicators.',
    'Coordinate with neighbors and local authorities.',
    'Ensure emergency kits are stocked and accessible.',
  ],
  extreme: [
    'Follow all official emergency guidance immediately.',
    'Activate community disaster response protocols.',
    'Prioritize safety of people, livestock, and critical infrastructure.',
  ],
};

export function normalizeRiskLevel(level: string): RiskLevel {
  const lower = level.toLowerCase();
  if (lower === 'extreme') return 'extreme';
  if (lower === 'high') return 'high';
  if (lower === 'medium') return 'medium';
  return 'low';
}

export function getRecommendations(
  category: RiskCategory,
  level: string
): string[] {
  const normalized = normalizeRiskLevel(level);
  switch (category) {
    case 'flood':
      return FLOOD_RECOMMENDATIONS[normalized];
    case 'drought':
      return DROUGHT_RECOMMENDATIONS[normalized];
    case 'overall':
      return OVERALL_RECOMMENDATIONS[normalized];
    default:
      return OVERALL_RECOMMENDATIONS[normalized];
  }
}

export function getCombinedRecommendations(
  floodLevel: string,
  droughtLevel: string
): { flood: string[]; drought: string[]; overall: string[] } {
  const floodNorm = normalizeRiskLevel(floodLevel);
  const droughtNorm = normalizeRiskLevel(droughtLevel);

  // Overall level is the higher of the two
  const levels: RiskLevel[] = ['low', 'medium', 'high', 'extreme'];
  const overallLevel =
    levels[Math.max(levels.indexOf(floodNorm), levels.indexOf(droughtNorm))];

  return {
    flood: FLOOD_RECOMMENDATIONS[floodNorm],
    drought: DROUGHT_RECOMMENDATIONS[droughtNorm],
    overall: OVERALL_RECOMMENDATIONS[overallLevel],
  };
}
