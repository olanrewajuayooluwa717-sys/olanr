/** Configurable unit rates for economics estimates (₦) */
export const POWER_RATES = {
  electricityPerKwh: Number(process.env.ELECTRICITY_RATE_NGN ?? 85),
  dieselPerLiter: Number(process.env.DIESEL_RATE_NGN ?? 1200),
  petrolPerLiter: Number(process.env.PETROL_RATE_NGN ?? 1100),
};

export const MISC_COST_CATEGORIES = ['salary', 'transport', 'chemicals', 'repairs', 'other'] as const;
export type MiscCostCategory = (typeof MISC_COST_CATEGORIES)[number];
