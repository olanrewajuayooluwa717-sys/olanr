export type FoodClassLabel = 'Protein' | 'Carbohydrate' | 'Others';

export interface MarketCategoryDto {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  _count?: { products: number };
}

export interface MarketProductDto {
  id: string;
  farmId: string;
  categoryId?: string | null;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  description?: string | null;
  sold: boolean;
  createdAt: string;
  farm?: {
    id: string;
    name: string;
    city?: string;
    state?: string;
    user?: { id: string; name: string; email: string };
  };
  category?: { id: string; title: string } | null;
}

export interface GlobalIngredientDto {
  id: string;
  name: string;
  crudeProteinPct: number;
  inclusionRatio: number;
  composition?: string | null;
  foodClass: 'protein' | 'carbohydrate' | 'others';
}

export interface FcrMonthConfigDto {
  month: number;
  bodyWeightPct: number;
  fcr: number;
}
