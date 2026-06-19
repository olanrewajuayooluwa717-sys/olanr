/** Shared domain types used across API, web, and calc-engine */

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
  farmName: string;
  location: string;
  city: string;
  state: string;
  country: string;
  pondName: string;
  pondNumber: number;
  dimensions: PondDimensions;
  averageWeightAtStockingG: number;
  fingerlingPrice: number;
  quantityStocked: number;
  stockingDate: Date;
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
