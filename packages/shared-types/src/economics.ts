import { FEED_INGREDIENT_NAMES_FROM_LEGACY } from './ingredients';

/** Common feed ingredient names for cost matrix — prefers full legacy catalog */
export const FEED_INGREDIENT_NAMES = FEED_INGREDIENT_NAMES_FROM_LEGACY;

export const MISC_COST_CATEGORIES = ['salary', 'transport', 'chemicals', 'repairs', 'other'] as const;
export type MiscCostCategory = (typeof MISC_COST_CATEGORIES)[number];
