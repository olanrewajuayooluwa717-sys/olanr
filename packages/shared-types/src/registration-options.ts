/** Dropdown options aligned with legacy admin / Excel registration */

export const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say'] as const;

export const AGE_RANGE_OPTIONS = ['18–25', '26–35', '36–45', '46–55', '56+'] as const;

export const POND_TYPE_OPTIONS = ['Earthen', 'Concrete', 'Plastic / tarpaulin', 'Cage', 'RAS (recirculating)'] as const;

export const CULTURE_SYSTEM_OPTIONS = [
  { value: 'extensive', label: 'Extensive' },
  { value: 'semi_intensive', label: 'Semi-intensive' },
  { value: 'intensive', label: 'Intensive' },
] as const;

export const FISH_SPECIES_OPTIONS = [
  'Catfish',
  'Tilapia',
  'Carp',
  'Trout',
  'Salmon',
  'Other',
] as const;

export const FEED_TYPE_OPTIONS = ['Floating', 'Sinking', 'Pellet', 'Mash'] as const;

export const WATER_SOURCE_OPTIONS = [
  'Borehole',
  'River / stream',
  'Rain-fed',
  'Municipal supply',
  'Well',
  'Recycled / RAS',
  'Other',
] as const;

export const POWER_SOURCE_OPTIONS = [
  { value: 'electricity', label: 'Electricity (kWh)' },
  { value: 'diesel', label: 'Diesel (litres)' },
  { value: 'petrol', label: 'Petrol (litres)' },
  { value: 'solar', label: 'Solar (kWh)' },
] as const;
