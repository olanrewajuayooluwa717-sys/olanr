import { BAG_SIZE_KG, dayInCultureCycle } from '@fishmaster/calc-engine';
import type { DailyPowerLog, FeedBrandMonth, MiscCostCategory } from '@fishmaster/db';
import { POWER_RATES } from './economics-config';

type FeedBrand = Pick<FeedBrandMonth, 'month' | 'costPerBag'>;

function feedBrandForDay(feedBrands: FeedBrand[], dayInCycle: number) {
  const month = Math.min(6, Math.max(1, Math.ceil(dayInCycle / 30)));
  return feedBrands.find((b) => b.month === month) ?? feedBrands[0] ?? null;
}

export function computeCumulativeFeedCost(
  feedLogs: { actualKg: number }[],
  feedBrands: FeedBrand[],
  stockingDate: Date,
) {
  const totalActualFeedKg = feedLogs.reduce((sum, l) => sum + l.actualKg, 0);
  const dayInCycle = dayInCultureCycle(stockingDate, new Date());
  const currentBrand = feedBrandForDay(feedBrands, dayInCycle);
  const costPerKg = currentBrand ? currentBrand.costPerBag / BAG_SIZE_KG : null;
  return costPerKg != null ? totalActualFeedKg * costPerKg : null;
}

export function computePowerCostEstimate(powerLogs: DailyPowerLog[]) {
  let total = 0;
  for (const log of powerLogs) {
    total += (log.electricityKwh ?? 0) * POWER_RATES.electricityPerKwh;
    total += (log.dieselLiters ?? 0) * POWER_RATES.dieselPerLiter;
    total += (log.petrolLiters ?? 0) * POWER_RATES.petrolPerLiter;
  }
  return total;
}

export function sumMiscCostsByCategory(
  logs: { category: MiscCostCategory; amount: number }[],
) {
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const log of logs) {
    byCategory[log.category] = (byCategory[log.category] ?? 0) + log.amount;
    total += log.amount;
  }
  return { byCategory, total };
}

export function computeEconomicsSummary(input: {
  feedLogs: { actualKg: number }[];
  feedBrands: FeedBrand[];
  stockingDate: Date;
  powerLogs: DailyPowerLog[];
  miscCostLogs: { category: MiscCostCategory; amount: number }[];
  salesLogs: { totalRevenue: number | null }[];
}) {
  const cumulativeFeedCost = computeCumulativeFeedCost(
    input.feedLogs,
    input.feedBrands,
    input.stockingDate,
  );
  const powerCostEstimate = computePowerCostEstimate(input.powerLogs);
  const { byCategory: miscCostsByCategory, total: miscCostsTotal } = sumMiscCostsByCategory(
    input.miscCostLogs,
  );
  const salesRevenue = input.salesLogs.reduce((sum, s) => sum + (s.totalRevenue ?? 0), 0);

  const totalCosts =
    (cumulativeFeedCost ?? 0) + powerCostEstimate + miscCostsTotal;
  const profitLoss = salesRevenue - totalCosts;

  return {
    cumulativeFeedCost,
    powerCostEstimate,
    powerRates: POWER_RATES,
    miscCostsByCategory,
    miscCostsTotal,
    salesRevenue,
    totalCosts,
    profitLoss,
  };
}
