/** FCR and % body weight coefficients per month — from `FCR, %body Wt` sheet */

export interface FcrMonthCoefficients {
  month: number;
  fcr: number;
  bodyWeightPct: number;
  feedSizeMm: string;
}

/** Default coefficients from App Fishmaster.xlsx */
export const DEFAULT_FCR_COEFFICIENTS: FcrMonthCoefficients[] = [
  { month: 1, fcr: 0.6, bodyWeightPct: 0.045, feedSizeMm: '2mm' },
  { month: 2, fcr: 0.75, bodyWeightPct: 0.033, feedSizeMm: '3mm' },
  { month: 3, fcr: 0.8, bodyWeightPct: 0.02, feedSizeMm: '4.5mm' },
  { month: 4, fcr: 0.8, bodyWeightPct: 0.02, feedSizeMm: '6mm' },
  { month: 5, fcr: 1.0, bodyWeightPct: 0.01, feedSizeMm: '8mm' },
  { month: 6, fcr: 1.1, bodyWeightPct: 0.012, feedSizeMm: '8mm' },
];

export const BAG_SIZE_KG = 15;

export const STOCKING_DENSITY = {
  extensive: 70,
  semiIntensive: 110,
  intensive: 130,
} as const;

export const FEED_SPLIT = {
  morning: 0.9,
  evening: 0.1,
} as const;

export interface AlertThresholds {
  underfeedingPct: number;
  overfeedingPct: number;
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  underfeedingPct: 0.9,
  overfeedingPct: 1.1,
};
