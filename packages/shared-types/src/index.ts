/** Shared domain types used across API, web, and calc-engine */

export * from './catalog';
export * from './registration-options';
export * from './economics';
export * from './ingredients';
export * from './marketplace';

export type SubscriptionTier = 'basic' | 'standard' | 'premium';

export type UserRole = 'member' | 'manager' | 'super_admin';

export type StockingIntensity = 'extensive' | 'semi_intensive' | 'intensive';

export interface PondDimensions {
  lengthM: number;
  widthM: number;
  depthM: number;
}

export interface RegistrationInput {
  farmerName: string;
  surname?: string;
  gender?: string;
  ageRange?: string;
  phone?: string;
  postcode?: string;
  lga?: string;
  farmName: string;
  farmPhone?: string;
  location: string;
  farmPostcode?: string;
  farmLga?: string;
  farmSizeSqM?: number;
  totalPonds?: number;
  city: string;
  state: string;
  country: string;
  pondName: string;
  pondNumber: number;
  pondType?: string;
  dimensions: PondDimensions;
  cultureSystem?: StockingIntensity;
  fishSpecies?: string;
  averageWeightAtStockingG: number;
  fingerlingPrice: number;
  quantityStocked: number;
  stockingDate: Date;
  proposedSalesDate?: Date;
  feedName?: string;
  feedType?: string;
  feedMaker?: string;
  feedBags?: number;
  desiredCrudeProteinPct: number;
  desiredFeedQuantityKg: number;
}

export interface DailyMortalityEntry {
  date: Date;
  mortality: number;
}

export interface DailyFeedActual {
  date: Date;
  actualFeedKg: number;
}

export interface FeedBrandMonth {
  month: number;
  brand: string;
  feedSizeMm: number;
  costPerBag: number;
  crudeProteinPct: number;
}

export interface StockCycleInput extends RegistrationInput {
  dailyMortality?: DailyMortalityEntry[];
  dailyFeedActuals?: DailyFeedActual[];
  feedBrands?: FeedBrandMonth[];
}

export interface AdvisedStockingResult {
  pondVolumeLiters: number;
  extensive: number;
  semiIntensive: number;
  intensive: number;
}

export interface MonthlyProjection {
  month: number;
  endDate: Date;
  fcr: number;
  bodyWeightPct: number;
  feedSizeMm: string;
  expectedAvgWeightG: number;
  expectedTotalWeightKg: number;
  monthlyFeedKg: number;
  monthlyFeedBags: number;
  cumulativeFeedKg: number;
  cumulativeFeedBags: number;
}

export interface DailyFeedChartRow {
  date: Date;
  dayInCycle: number;
  presentQuantity: number;
  averageWeightG: number;
  totalWeightG: number;
  feedGiftG: number;
  morningFeedG: number;
  eveningFeedG: number;
  feedKg: number;
  feedBags: number;
  cumulativeFeedG: number;
  cumulativeFeedKg: number;
  weightGainG: number;
}

export interface MonthlyMortalitySummary {
  month: number;
  monthlyMortality: number;
  cumulativeMortality: number;
  closingStock: number;
  openingStock: number;
  mortalityPct: number;
}

export interface FeedAlert {
  type: 'underfeeding' | 'overfeeding' | 'normal';
  expectedKg: number;
  actualKg: number;
  deviationPct: number;
}

export interface StockCycleReport {
  advisedStocking: AdvisedStockingResult;
  monthlyProjections: MonthlyProjection[];
  dailyFeedCharts: DailyFeedChartRow[][];
  mortalitySummaries: MonthlyMortalitySummary[];
  cycleFeedKg: { months4: number; months5: number; months6: number };
  cycleFeedBags: { months4: number; months5: number; months6: number };
  averageFcr: number;
}
