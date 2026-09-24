/** Dropdown options aligned with Excel registration */

export const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say'] as const;

export const AGE_RANGE_OPTIONS = ['18–25', '26–35', '36–45', '46–55', '56+'] as const;

/** Pond structures only — RAS belongs under culture system */
export const POND_TYPE_OPTIONS = [
  'Cage',
  'Concrete',
  'Earthen',
  'Leather',
  'Plastic / tarpaulin',
] as const;

export const CULTURE_SYSTEM_OPTIONS = [
  { value: 'extensive', label: 'Extensive' },
  { value: 'semi_intensive', label: 'Semi-intensive' },
  { value: 'intensive', label: 'Intensive' },
  { value: 'ras', label: 'RAS (recirculating system)' },
] as const;

/** Freshwater culture species — alphabetical flat list */
export const FISH_SPECIES_OPTIONS = [
  'African sharptooth catfish',
  'Atlantic salmon',
  'Barramundi',
  'Bighead carp',
  'Black carp',
  'Blue catfish',
  'Brook trout',
  'Brown trout',
  'Catla',
  'Channel catfish',
  'Clarias catfishes',
  'Common carp',
  'Crucian carp',
  'European perch',
  'Giant barb',
  'Giant snakehead',
  'Grass carp',
  'Heterotis (African bony tongue)',
  'Largemouth bass',
  'Mekong giant catfish',
  'Milkfish',
  'Nile tilapia',
  'Pearlspot',
  'Rainbow trout',
  'Rohu',
  'Silver carp',
  'Spotted snakehead',
  'Striped catfish / Pangasius',
  'Striped snakehead',
  'Tilapias nei',
  'Walking catfish',
  'Wuchang bream',
  'Yellow perch',
] as const;

export const FEED_TYPE_OPTIONS = ['Floating', 'Sinking', 'Pellet', 'Mash'] as const;

export const WATER_SOURCE_OPTIONS = [
  'Borehole',
  'Municipal supply',
  'Other',
  'Rain-fed',
  'Recycled',
  'River / stream',
  'Well',
] as const;

export const FARM_SIZE_ACRES_OPTIONS = [
  'Quarter acre',
  'Half acre',
  '1 acre',
  '5 acres',
  '6–10 acres',
  '11–20 acres',
  '21–50 acres',
  '51–100 acres',
  '100+ acres',
] as const;

export const ESTIMATED_FISH_OUTPUT_OPTIONS = [
  'Under 1 tonne / year',
  '1–5 tonnes / year',
  '5–10 tonnes / year',
  '10–25 tonnes / year',
  '25–50 tonnes / year',
  '50–100 tonnes / year',
  '100+ tonnes / year',
] as const;

export const CURRENCY_OPTIONS = [
  { code: 'NGN', symbol: '₦', label: 'NGN (₦)' },
  { code: 'GHS', symbol: 'GH₵', label: 'GHS (GH₵)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'KES', symbol: 'KSh', label: 'KES (KSh)' },
  { code: 'ZAR', symbol: 'R', label: 'ZAR (R)' },
] as const;

export const POWER_SOURCE_OPTIONS = [
  { value: 'electricity', label: 'Electricity (kWh)' },
  { value: 'diesel', label: 'Diesel (litres)' },
  { value: 'petrol', label: 'Petrol (litres)' },
  { value: 'solar', label: 'Solar (kWh)' },
] as const;

/** Sentinel value for “fill yourself” custom select entries */
export const CUSTOM_OPTION_VALUE = '__custom__';

export const REGISTRATION_RANGES = {
  crudeProteinPct: { min: 18, max: 45 },
  initialPh: { min: 4.5, max: 10 },
  dissolvedOxygenMgL: { min: 0.5, max: 18 },
} as const;

export const PASSWORD_RULE_HINT =
  'Password must contain at least one capital letter, one lowercase letter, and one symbol (e.g. !@#$%).';

export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one capital letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include at least one symbol.';
  }
  return null;
}

export function currencySymbol(code: string): string {
  return CURRENCY_OPTIONS.find((c) => c.code === code)?.symbol ?? code;
}

/** Guess settlement/display currency from a free-text country name. */
export function currencyFromCountry(country: string | null | undefined): string {
  if (!country) return 'NGN';
  const c = country.trim().toLowerCase();
  if (c === 'ng' || c.includes('nigeria')) return 'NGN';
  if (c === 'gb' || c === 'uk' || c.includes('united kingdom') || c.includes('britain') || c.includes('england') || c.includes('scotland') || c.includes('wales')) {
    return 'GBP';
  }
  if (c === 'us' || c.includes('united states') || c === 'usa' || c.includes('america')) return 'USD';
  if (c === 'gh' || c.includes('ghana')) return 'GHS';
  if (c === 'ke' || c.includes('kenya')) return 'KES';
  if (c === 'za' || c.includes('south africa')) return 'ZAR';
  if (c === 'eu' || c.includes('ireland') || c.includes('france') || c.includes('germany') || c.includes('netherlands') || c.includes('spain') || c.includes('italy')) {
    return 'EUR';
  }
  return 'NGN';
}

export function formatMoney(amount: number, currencyCode: string): string {
  const code = (currencyCode || 'NGN').toUpperCase();
  const symbol = currencySymbol(code);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
}

export function clampRegistrationNumber(
  value: number,
  range: { min: number; max: number },
): number {
  if (Number.isNaN(value)) return range.min;
  return Math.min(range.max, Math.max(range.min, value));
}

/**
 * Member activity categories (Excel registration — multi-select).
 * Used so backend can answer “by location, what do users do?”
 */
export const MEMBER_CATEGORIES = [
  { value: 'fish_breeder', label: 'Fish Breeder' },
  { value: 'table_fish_farmer', label: 'Table Fish Farmer' },
  { value: 'fish_feed_manufacturer', label: 'Fish Feed Manufacturer' },
  { value: 'fish_feed_seller', label: 'Fish Feed Seller' },
  { value: 'aquaculture_logistics_provider', label: 'Aquaculture Logistics Provider' },
  { value: 'fresh_fish_marketer', label: 'Fresh Fish Marketer' },
  { value: 'aquaculture_consultant', label: 'Aquaculture Consultant' },
  { value: 'fish_processor', label: 'Fish Processor' },
  { value: 'fisheries_lecturer', label: 'Fisheries Lecturer' },
  { value: 'fisheries_student', label: 'Fisheries Student' },
  { value: 'fish_feed_ingredients_supplier', label: 'Fish Feed Ingredients Supplier' },
  { value: 'fish_production_equipment_supplier', label: 'Fish Production Equipment Supplier' },
  { value: 'water_quality_management_expert', label: 'Water Quality Management Expert' },
  { value: 'others', label: 'Others' },
] as const;

export type MemberCategoryValue = (typeof MEMBER_CATEGORIES)[number]['value'];

export const MEMBER_CATEGORY_VALUES: readonly MemberCategoryValue[] =
  MEMBER_CATEGORIES.map((c) => c.value);

export function isMemberCategory(v: string): v is MemberCategoryValue {
  return (MEMBER_CATEGORY_VALUES as readonly string[]).includes(v);
}

export function memberCategoryLabel(value: string): string {
  return MEMBER_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
