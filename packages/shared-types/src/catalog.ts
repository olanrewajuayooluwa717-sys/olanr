/** All 21 pond reports — included free with monthly subscription (not pay-per-report) */
export const REPORT_CATALOG = [
  { id: 1, title: 'Advised feed size to give stock per pond', short: 'Feed size' },
  { id: 2, title: 'Advised stock based on pond dimensions & water volume', short: 'Stocking' },
  { id: 3, title: 'Cumulative bags of feed needed per pond', short: 'Cum. bags' },
  { id: 4, title: 'Cumulative feed (kg) & total fish weight per pond', short: 'Cum. feed' },
  { id: 5, title: 'Cumulative fish mortality record per pond', short: 'Cum. mort.' },
  { id: 6, title: 'Estimated feed quantity (kg) for fish stock', short: 'Est. feed kg' },
  { id: 7, title: 'Estimated feed quantity / bags for fish stock', short: 'Est. bags' },
  { id: 8, title: 'Expected 15 kg bags needed per month', short: 'Mo. bags' },
  { id: 9, title: 'Expected monthly average weight at stocking', short: 'Mo. weight' },
  { id: 10, title: 'Expected monthly feed consumption (kg)', short: 'Mo. feed' },
  { id: 11, title: 'Expected monthly total weight of fishes per pond', short: 'Mo. biomass' },
  { id: 12, title: 'Daily feed chart per pond', short: 'Daily feed' },
  { id: 13, title: 'Fish quantity at close of day', short: 'Daily qty' },
  { id: 14, title: 'Monthly feed consumed & monthly closing stock', short: 'Feed & stock' },
  { id: 15, title: 'Monthly feed (kg) & monthly average weight', short: 'Feed & wt' },
  { id: 16, title: 'Monthly feed (kg) & monthly mortality', short: 'Feed & mort.' },
  { id: 17, title: 'Monthly feed (kg) & monthly total weight', short: 'Feed & biomass' },
  { id: 18, title: 'Monthly mortality & fish quantity records', short: 'Mort. & qty' },
  { id: 19, title: 'Monthly mortality records per pond', short: 'Mort. log' },
  { id: 20, title: 'Monthly opening & closing stock per pond', short: 'Open/close' },
  { id: 21, title: 'Monthly quantity & fish percentage mortality', short: 'Mort. %' },
] as const;

export type ContentCategory = 'advert' | 'article' | 'information' | 'picture' | 'video';

export const CONTENT_CATEGORIES: { type: ContentCategory; label: string; icon: string }[] = [
  { type: 'advert', label: 'Adverts', icon: '📢' },
  { type: 'article', label: 'Articles', icon: '📰' },
  { type: 'information', label: 'Information', icon: 'ℹ️' },
  { type: 'picture', label: 'Pictures', icon: '🖼️' },
  { type: 'video', label: 'Videos', icon: '🎬' },
];

export const TIER_LABELS: Record<string, string> = {
  basic: 'Fishmaster Lite',
  standard: 'Fishmaster Plus',
  premium: 'Fishmaster Max',
};
