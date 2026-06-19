import type { DailyFeedChartRow } from '@fishmaster/shared-types';
import type { FishQuantityDay } from './fish-quantity';
import type { FcrMonthCoefficients } from './constants';
import { BAG_SIZE_KG, FEED_SPLIT } from './constants';

/** Generate daily feed chart for one month — `MONTH N FEED CHART` sheets */
export function buildDailyFeedChart(
  fishDays: FishQuantityDay[],
  stockingWeightG: number,
  coefficients: FcrMonthCoefficients,
): DailyFeedChartRow[] {
  const { fcr, bodyWeightPct } = coefficients;
  const rows: DailyFeedChartRow[] = [];

  let cumulativeFeedG = 0;
  let prevTotalWeightG = 0;
  let prevWeightGainG = 0;

  for (let i = 0; i < fishDays.length; i++) {
    const fish = fishDays[i];
    const presentQty = fish.presentQuantity;

    let averageWeightG: number;
    let totalWeightG: number;

    if (i === 0) {
      averageWeightG = stockingWeightG;
      totalWeightG = presentQty * averageWeightG;
    } else {
      totalWeightG = prevTotalWeightG + prevWeightGainG;
      averageWeightG = presentQty > 0 ? totalWeightG / presentQty : 0;
    }

    const feedGiftG = totalWeightG * bodyWeightPct;
    const morningFeedG = feedGiftG * FEED_SPLIT.morning;
    const eveningFeedG = feedGiftG * FEED_SPLIT.evening;
    const feedKg = feedGiftG / 1000;
    const feedBags = feedKg / BAG_SIZE_KG;
    cumulativeFeedG += feedGiftG;
    const weightGainG = fcr > 0 ? feedGiftG / fcr : 0;

    rows.push({
      date: fish.date,
      dayInCycle: fish.dayInCycle,
      presentQuantity: presentQty,
      averageWeightG,
      totalWeightG,
      feedGiftG,
      morningFeedG,
      eveningFeedG,
      feedKg,
      feedBags,
      cumulativeFeedG,
      cumulativeFeedKg: cumulativeFeedG / 1000,
      weightGainG,
    });

    prevTotalWeightG = totalWeightG;
    prevWeightGainG = weightGainG;
  }

  return rows;
}

/** Sum monthly feed kg from daily chart */
export function sumMonthlyFeedKg(chart: DailyFeedChartRow[]): number {
  return chart.reduce((sum, row) => sum + row.feedKg, 0);
}

/** End-of-month expected average weight from last chart row */
export function endOfMonthAvgWeightG(chart: DailyFeedChartRow[]): number {
  if (chart.length === 0) return 0;
  return chart[chart.length - 1].averageWeightG;
}
