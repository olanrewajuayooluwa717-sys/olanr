import { describe, it, expect } from 'vitest';
import type { StockCycleInput } from '@fishmaster/shared-types';
import {
  calculatePondVolumeLiters,
  calculateAdvisedStocking,
  generateStockCycleReport,
  detectFeedAlert,
} from '../src';

/** Fixture from App Fishmaster.xlsx sample (AYOOLUWA OGUNSINA) */
const sampleInput: StockCycleInput = {
  farmerName: 'AYOOLUWA OGUNSINA',
  farmName: 'Fishmaster Foods Ltd',
  location: 'AKOBO',
  city: 'Ibadan',
  state: 'Oyo',
  country: 'Nigeria',
  pondName: 'fishmaster 1',
  pondNumber: 12,
  dimensions: { lengthM: 2, widthM: 3, depthM: 1.3 },
  averageWeightAtStockingG: 8,
  fingerlingPrice: 30,
  quantityStocked: 2500,
  stockingDate: new Date('2021-01-31'),
  desiredCrudeProteinPct: 38,
  desiredFeedQuantityKg: 1500,
};

const approx = (actual: number, expected: number, tolerancePct = 5) => {
  const diff = Math.abs(actual - expected) / expected;
  expect(diff).toBeLessThan(tolerancePct / 100);
};

describe('pond calculations', () => {
  it('calculates pond volume from registration formula', () => {
    expect(calculatePondVolumeLiters(sampleInput.dimensions)).toBeCloseTo(7800, 0);
  });

  it('calculates advised stocking densities', () => {
    const result = calculateAdvisedStocking(sampleInput.dimensions);
    expect(result.extensive).toBeCloseTo(546, 0);
    expect(result.semiIntensive).toBeCloseTo(858, 0);
    expect(result.intensive).toBeCloseTo(1014, 0);
  });
});

describe('stock cycle report', () => {
  it('generates month 1 projections near Excel values', () => {
    const report = generateStockCycleReport(sampleInput);
    const month1 = report.monthlyProjections[0];

    // Excel: EXPECTED MONTHLY FEED kg E10 = 92.75
    approx(month1.monthlyFeedKg, 92.75, 15);
    // Excel: EXPECTED MONTHLY AVERAGE WEIGHT E8 = 65.15g
    approx(month1.expectedAvgWeightG, 65.15, 15);
    // Excel: Expected Feed Bags D8 = 6.18
    approx(month1.monthlyFeedBags, 6.18, 15);
    expect(month1.feedSizeMm).toBe('2mm');
  });

  it('computes average FCR across 6 months (E-column coefficients)', () => {
    const report = generateStockCycleReport(sampleInput);
    // Average of daily-chart FCR values (E11–E16): (0.6+0.75+0.8+0.8+1+1.1)/6
    approx(report.averageFcr, 0.8417, 1);
  });

  it('computes 6-month cumulative feed near Excel', () => {
    const report = generateStockCycleReport(sampleInput);
    // Excel: FEED QTY 6 MONTHS E8 = 3911.48 kg
    approx(report.cycleFeedKg.months6, 3911.48, 15);
  });
});

describe('feed alerts', () => {
  it('detects underfeeding', () => {
    const alert = detectFeedAlert(100, 80);
    expect(alert.type).toBe('underfeeding');
  });

  it('detects overfeeding', () => {
    const alert = detectFeedAlert(100, 120);
    expect(alert.type).toBe('overfeeding');
  });

  it('detects normal feeding', () => {
    const alert = detectFeedAlert(100, 95);
    expect(alert.type).toBe('normal');
  });
});
