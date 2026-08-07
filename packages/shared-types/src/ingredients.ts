/** Legacy admin.fishmaster.ng ingredient catalog (25 items) */

export type FoodClass = 'protein' | 'carbohydrate' | 'others';

export interface LegacyIngredient {
  name: string;
  foodClass: FoodClass;
  crudeProteinPct: number;
  inclusionRatio: number;
  composition?: string;
}

export const LEGACY_INGREDIENTS: readonly LegacyIngredient[] = [
  { name: '72% Fish meal', foodClass: 'protein', crudeProteinPct: 72, inclusionRatio: 0.15, composition: 'Fish meal' },
  { name: 'Yeast', foodClass: 'protein', crudeProteinPct: 45, inclusionRatio: 0.03, composition: 'Brewers yeast' },
  { name: 'Poultry meal', foodClass: 'protein', crudeProteinPct: 60, inclusionRatio: 0.1, composition: 'Poultry by-product' },
  { name: 'Groundnut cake', foodClass: 'protein', crudeProteinPct: 45, inclusionRatio: 0.12, composition: 'Groundnut cake' },
  { name: '65% Fish meal', foodClass: 'protein', crudeProteinPct: 65, inclusionRatio: 0.12, composition: 'Fish meal' },
  { name: 'Soya meal', foodClass: 'protein', crudeProteinPct: 44, inclusionRatio: 0.2, composition: 'Soybean meal' },
  { name: 'Fullfat soya', foodClass: 'protein', crudeProteinPct: 36, inclusionRatio: 0.08, composition: 'Full-fat soybean' },
  { name: 'Blood meal 1', foodClass: 'protein', crudeProteinPct: 80, inclusionRatio: 0.03, composition: 'Blood meal' },
  { name: 'Blood meal 2', foodClass: 'protein', crudeProteinPct: 85, inclusionRatio: 0.02, composition: 'Blood meal' },
  { name: 'Maize', foodClass: 'carbohydrate', crudeProteinPct: 9, inclusionRatio: 0.25, composition: 'Maize grain' },
  { name: 'Wheat flour', foodClass: 'carbohydrate', crudeProteinPct: 11, inclusionRatio: 0.1, composition: 'Wheat flour' },
  { name: 'Cassava flour', foodClass: 'carbohydrate', crudeProteinPct: 2, inclusionRatio: 0.08, composition: 'Cassava flour' },
  { name: 'Rice bran', foodClass: 'carbohydrate', crudeProteinPct: 12, inclusionRatio: 0.1, composition: 'Rice bran' },
  { name: 'Cassava crumbs', foodClass: 'carbohydrate', crudeProteinPct: 2.5, inclusionRatio: 0.05, composition: 'Cassava crumbs' },
  { name: 'Vitamin C', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.001, composition: 'Ascorbic acid' },
  { name: 'Methionine', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.003, composition: 'DL-Methionine' },
  { name: 'Lysine', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.004, composition: 'L-Lysine' },
  { name: 'Vitamin premix', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.005, composition: 'Vitamin premix' },
  { name: 'Oxytetracycline', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.0005, composition: 'Antibiotic premix' },
  { name: 'Bone meal', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.02, composition: 'Bone meal' },
  { name: 'Dicalcium phosphate', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.015, composition: 'DCP' },
  { name: 'Probiotic', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.001, composition: 'Probiotic blend' },
  { name: 'Poultry oil', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.03, composition: 'Poultry fat' },
  { name: 'Soya oil', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.02, composition: 'Soybean oil' },
  { name: 'Anti toxin', foodClass: 'others', crudeProteinPct: 0, inclusionRatio: 0.001, composition: 'Mycotoxin binder' },
] as const;

/** Names only — for cycle cost matrix defaults */
export const FEED_INGREDIENT_NAMES_FROM_LEGACY = LEGACY_INGREDIENTS.map((i) => i.name);
