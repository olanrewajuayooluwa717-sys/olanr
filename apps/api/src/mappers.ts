import type { StockCycleInput } from '@fishmaster/shared-types';
import type { Farm, Pond, StockCycle, DailyMortalityLog, DailyFeedLog, User } from '@fishmaster/db';

type CycleWithRelations = StockCycle & {
  pond: Pond & { farm: Farm & { user: User } };
  mortalityLogs: DailyMortalityLog[];
  feedLogs: DailyFeedLog[];
};

export function toStockCycleInput(cycle: CycleWithRelations): StockCycleInput {
  const { pond } = cycle;
  const { farm } = pond;

  return {
    farmerName: farm.user.name,
    farmName: farm.name,
    location: farm.location,
    city: farm.city,
    state: farm.state,
    country: farm.country,
    pondName: pond.name,
    pondNumber: pond.number,
    dimensions: { lengthM: pond.lengthM, widthM: pond.widthM, depthM: pond.depthM },
    averageWeightAtStockingG: cycle.averageWeightAtStockingG,
    fingerlingPrice: cycle.fingerlingPrice,
    quantityStocked: cycle.quantityStocked,
    stockingDate: cycle.stockingDate,
    desiredCrudeProteinPct: cycle.desiredCrudeProteinPct,
    desiredFeedQuantityKg: cycle.desiredFeedQuantityKg,
    dailyMortality: cycle.mortalityLogs.map((m) => ({ date: m.date, mortality: m.count })),
    dailyFeedActuals: cycle.feedLogs.map((f) => ({ date: f.date, actualFeedKg: f.actualKg })),
  };
}
