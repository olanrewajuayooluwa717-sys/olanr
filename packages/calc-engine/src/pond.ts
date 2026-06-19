import type { PondDimensions, AdvisedStockingResult } from '@fishmaster/shared-types';
import { STOCKING_DENSITY } from './constants';

/** Pond volume in liters: (L × W × D) × 1000 — Registration!D21 */
export function calculatePondVolumeLiters(dimensions: PondDimensions): number {
  const { lengthM, widthM, depthM } = dimensions;
  return lengthM * widthM * depthM * 1000;
}

/** Advised stocking per pond — `Advised Stocking Capacity pond` sheet */
export function calculateAdvisedStocking(dimensions: PondDimensions): AdvisedStockingResult {
  const pondVolumeLiters = calculatePondVolumeLiters(dimensions);
  const volumeM3 = pondVolumeLiters / 1000;

  return {
    pondVolumeLiters,
    extensive: volumeM3 * STOCKING_DENSITY.extensive,
    semiIntensive: volumeM3 * STOCKING_DENSITY.semiIntensive,
    intensive: volumeM3 * STOCKING_DENSITY.intensive,
  };
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
