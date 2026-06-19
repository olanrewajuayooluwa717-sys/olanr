import type { DailyMortalityEntry, MonthlyMortalitySummary } from '@fishmaster/shared-types';
import { addDays } from './pond';

export interface FishQuantityDay {
  date: Date;
  dayInCycle: number;
  stockedQuantity: number;
  presentQuantity: number;
  dailyMortality: number;
  cumulativeMortality: number;
}

/** Build daily fish quantity table — `Fish Quantity Month N` sheets */
export function buildFishQuantityDays(
  stockingDate: Date,
  quantityStocked: number,
  dailyMortality: DailyMortalityEntry[],
  daysInMonth = 30,
): FishQuantityDay[] {
  const firstFeedingDate = addDays(stockingDate, 1);
  const mortalityByDay = new Map<string, number>();

  for (const entry of dailyMortality) {
    const key = entry.date.toISOString().slice(0, 10);
    mortalityByDay.set(key, (mortalityByDay.get(key) ?? 0) + entry.mortality);
  }

  const rows: FishQuantityDay[] = [];
  let cumulativeMortality = 0;

  for (let i = 0; i < daysInMonth; i++) {
    const date = addDays(firstFeedingDate, i);
    const key = date.toISOString().slice(0, 10);
    const todayMortality = mortalityByDay.get(key) ?? 0;
    cumulativeMortality += todayMortality;

    rows.push({
      date,
      dayInCycle: i + 1,
      stockedQuantity: quantityStocked,
      presentQuantity: quantityStocked - cumulativeMortality,
      dailyMortality: todayMortality,
      cumulativeMortality,
    });
  }

  return rows;
}

/** Monthly mortality summaries for reports 5, 18–21 */
export function buildMonthlyMortalitySummaries(
  quantityStocked: number,
  monthlyMortalityTotals: number[],
): MonthlyMortalitySummary[] {
  let cumulativeMortality = 0;
  let openingStock = quantityStocked;

  return monthlyMortalityTotals.map((monthlyMortality, index) => {
    cumulativeMortality += monthlyMortality;
    const closingStock = quantityStocked - cumulativeMortality;
    const mortalityPct = closingStock > 0 ? (monthlyMortality / closingStock) * 100 : 0;

    const summary: MonthlyMortalitySummary = {
      month: index + 1,
      monthlyMortality,
      cumulativeMortality,
      closingStock,
      openingStock,
      mortalityPct,
    };

    openingStock = closingStock;
    return summary;
  });
}
