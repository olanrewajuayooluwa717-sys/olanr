import type {
  StockCycleInput,
  StockCycleReport,
  MonthlyProjection,
  FeedAlert,
  DailyFeedChartRow,
} from '@fishmaster/shared-types';
import {
  DEFAULT_FCR_COEFFICIENTS,
  DEFAULT_ALERT_THRESHOLDS,
  BAG_SIZE_KG,
  type FcrMonthCoefficients,
} from './constants';
import { calculateAdvisedStocking, addDays } from './pond';
import { buildFishQuantityDays, buildMonthlyMortalitySummaries } from './fish-quantity';
import {
  buildDailyFeedChart,
  sumMonthlyFeedKg,
  endOfMonthAvgWeightG,
} from './daily-feed-chart';

export interface GenerateReportOptions {
  fcrCoefficients?: FcrMonthCoefficients[];
  alertThresholds?: typeof DEFAULT_ALERT_THRESHOLDS;
}

/** Main entry: generate full stock cycle report from registration + daily inputs */
export function generateStockCycleReport(
  input: StockCycleInput,
  options: GenerateReportOptions = {},
): StockCycleReport {
  const coefficients = options.fcrCoefficients ?? DEFAULT_FCR_COEFFICIENTS;
  const advisedStocking = calculateAdvisedStocking(input.dimensions);

  const dailyFeedCharts: DailyFeedChartRow[][] = [];
  const monthlyMortalityTotals: number[] = [];
  let runningStock = input.quantityStocked;
  let startWeight = input.averageWeightAtStockingG;

  for (let monthIndex = 0; monthIndex < coefficients.length; monthIndex++) {
    const coef = coefficients[monthIndex];
    const cycleStart = addDays(input.stockingDate, monthIndex * 30);

    const monthMortality =
      input.dailyMortality?.filter((m) => {
        const firstFeed = addDays(cycleStart, 1);
        const monthEnd = addDays(firstFeed, 30);
        return m.date >= firstFeed && m.date < monthEnd;
      }) ?? [];

    const monthMortalityTotal = monthMortality.reduce((s, m) => s + m.mortality, 0);
    monthlyMortalityTotals.push(monthMortalityTotal);

    const fishDays = buildFishQuantityDays(cycleStart, runningStock, monthMortality);
    const chart = buildDailyFeedChart(fishDays, startWeight, coef);
    dailyFeedCharts.push(chart);

    runningStock = fishDays[fishDays.length - 1]?.presentQuantity ?? runningStock;
    startWeight = endOfMonthAvgWeightG(chart);
  }

  let cumulativeFeedKg = 0;
  let cumulativeFeedBags = 0;

  const monthlyProjections: MonthlyProjection[] = coefficients.map((coef, i) => {
    const chart = dailyFeedCharts[i];
    const monthlyFeedKg = sumMonthlyFeedKg(chart);
    const monthlyFeedBags = monthlyFeedKg / BAG_SIZE_KG;
    cumulativeFeedKg += monthlyFeedKg;
    cumulativeFeedBags += monthlyFeedBags;

    const lastRow = chart[chart.length - 1];
    const expectedAvgWeightG = lastRow?.averageWeightG ?? 0;
    const expectedTotalWeightKg = (lastRow?.totalWeightG ?? 0) / 1000;

    return {
      month: coef.month,
      endDate: lastRow?.date ?? addDays(input.stockingDate, (i + 1) * 30),
      fcr: coef.fcr,
      bodyWeightPct: coef.bodyWeightPct,
      feedSizeMm: coef.feedSizeMm,
      expectedAvgWeightG,
      expectedTotalWeightKg,
      monthlyFeedKg,
      monthlyFeedBags,
      cumulativeFeedKg,
      cumulativeFeedBags,
    };
  });

  const mortalitySummaries = buildMonthlyMortalitySummaries(
    input.quantityStocked,
    monthlyMortalityTotals,
  );

  const averageFcr =
    coefficients.reduce((sum, c) => sum + c.fcr, 0) / coefficients.length;

  return {
    advisedStocking,
    monthlyProjections,
    dailyFeedCharts,
    mortalitySummaries,
    cycleFeedKg: {
      months4: monthlyProjections[3]?.cumulativeFeedKg ?? 0,
      months5: monthlyProjections[4]?.cumulativeFeedKg ?? 0,
      months6: monthlyProjections[5]?.cumulativeFeedKg ?? 0,
    },
    cycleFeedBags: {
      months4: monthlyProjections[3]?.cumulativeFeedBags ?? 0,
      months5: monthlyProjections[4]?.cumulativeFeedBags ?? 0,
      months6: monthlyProjections[5]?.cumulativeFeedBags ?? 0,
    },
    averageFcr,
  };
}

/** Under/overfeeding detection for homepage */
export function detectFeedAlert(
  expectedKg: number,
  actualKg: number,
  thresholds = DEFAULT_ALERT_THRESHOLDS,
): FeedAlert {
  const deviationPct = expectedKg > 0 ? actualKg / expectedKg : 1;

  if (deviationPct < thresholds.underfeedingPct) {
    return { type: 'underfeeding', expectedKg, actualKg, deviationPct };
  }
  if (deviationPct > thresholds.overfeedingPct) {
    return { type: 'overfeeding', expectedKg, actualKg, deviationPct };
  }
  return { type: 'normal', expectedKg, actualKg, deviationPct };
}

/** Day in culture cycle from stocking date */
export function dayInCultureCycle(stockingDate: Date, today: Date): number {
  const firstFeeding = addDays(stockingDate, 1);
  const diff = Math.floor((today.getTime() - firstFeeding.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}