// The 12 scenario areas used across the Self Assessment, the Knowledge Live Questionnaire and the CM Onboarding Guide.
export const SCENARIOS = [
  { key: 'teams', label: 'MS Teams Integration', short: 'MS Teams', risk: 0 },
  { key: 'onsite', label: 'Onsite Event', short: 'Onsite', risk: 0 },
  { key: 'zoom', label: 'Zoom Integration', short: 'Zoom', risk: 0 },
  { key: 'hybrid', label: 'Hybrid Event', short: 'Hybrid', risk: 0 },
  { key: 'platform', label: 'KUDO Meeting Platform', short: 'Platform', risk: 0 },
  { key: 'widget', label: '3rd Party Platform (KUDO Widget)', short: 'Widget', risk: 0 },
  { key: 'external', label: 'External Meeting Platform', short: 'External', risk: 0 },
  { key: 'meetnow', label: 'Meet Now', short: 'Meet Now', risk: 0 },
  { key: 'rtmp', label: 'RTMP (YouTube / Facebook / IBM)', short: 'RTMP', risk: 0 },
  { key: 'hls', label: 'Broadcast to Web Page (HLS)', short: 'HLS', risk: 0 },
  { key: 'hi', label: 'Human Interpretation', short: 'Human Interp.', risk: 0 },
  { key: 'ai', label: 'AI Translation', short: 'AI Translation', risk: 0 },
];
export const SCENARIO_KEYS = SCENARIOS.map((s) => s.key);
export const REGIONS = ['EMEA', 'APAC', 'AMER'];
export const TEAMS = ['Sales', 'Client Managers', 'Partnerships', 'Language Services', 'Meeting Services', 'Technical Solutions / Support', 'Cross-team'];
// Team weights from Priority Weighting System v1
export const DEFAULT_WEIGHT = {
  Sales: 1, 'Client Managers': 1, Partnerships: 0.5, 'Language Services': 0.5,
  'Meeting Services': 0.5, 'Technical Solutions / Support': 0.5, 'Cross-team': 0,
};
// Risk input: number of 'critical' steps in the CM Onboarding Guide V3 across the products each scenario uses
// (Platform 3, Mobile Link 2, Widget 3, Zoom 1, Teams 2, Hybrid 2, HLS 3, RTMP 1, Meet Now 1, External Link 1).
// Editable by admins in the app (Settings). Re-count when the Guide changes.
export const CRITICAL_STEPS = {
  teams: 5, onsite: 5, zoom: 6, hybrid: 5, platform: 3, widget: 6,
  external: 6, meetnow: 1, rtmp: 4, hls: 6, hi: 3, ai: 3,
};
