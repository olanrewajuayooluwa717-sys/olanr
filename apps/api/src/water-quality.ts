export type WaterReading = {
  ph?: number | null;
  dissolvedOxygenMgL?: number | null;
  temperatureC?: number | null;
  ammoniaMgL?: number | null;
};

export type WaterAlert = { parameter: string; message: string; severity: 'warn' | 'critical' };

/** Typical catfish pond targets — advisory only, not medical advice */
export function evaluateWaterQuality(reading: WaterReading): WaterAlert[] {
  const alerts: WaterAlert[] = [];

  if (reading.ph != null) {
    if (reading.ph < 6.0 || reading.ph > 9.0) {
      alerts.push({ parameter: 'pH', message: `pH ${reading.ph} is critical (target 6.5–8.5)`, severity: 'critical' });
    } else if (reading.ph < 6.5 || reading.ph > 8.5) {
      alerts.push({ parameter: 'pH', message: `pH ${reading.ph} outside ideal range 6.5–8.5`, severity: 'warn' });
    }
  }

  if (reading.dissolvedOxygenMgL != null) {
    if (reading.dissolvedOxygenMgL < 3) {
      alerts.push({ parameter: 'DO', message: `DO ${reading.dissolvedOxygenMgL} mg/L is critically low (target ≥5)`, severity: 'critical' });
    } else if (reading.dissolvedOxygenMgL < 5) {
      alerts.push({ parameter: 'DO', message: `DO ${reading.dissolvedOxygenMgL} mg/L is low (target ≥5 mg/L)`, severity: 'warn' });
    }
  }

  if (reading.temperatureC != null) {
    if (reading.temperatureC < 20 || reading.temperatureC > 34) {
      alerts.push({ parameter: 'Temp', message: `Temperature ${reading.temperatureC}°C is extreme (target 25–30°C)`, severity: 'critical' });
    } else if (reading.temperatureC < 22 || reading.temperatureC > 32) {
      alerts.push({ parameter: 'Temp', message: `Temperature ${reading.temperatureC}°C outside comfort band`, severity: 'warn' });
    }
  }

  if (reading.ammoniaMgL != null && reading.ammoniaMgL > 0.5) {
    alerts.push({
      parameter: 'Ammonia',
      message: `Ammonia ${reading.ammoniaMgL} mg/L is elevated (target <0.5)`,
      severity: reading.ammoniaMgL > 1 ? 'critical' : 'warn',
    });
  }

  return alerts;
}
