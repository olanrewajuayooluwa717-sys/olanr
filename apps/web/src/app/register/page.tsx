'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AGE_RANGE_OPTIONS,
  CULTURE_SYSTEM_OPTIONS,
  FEED_TYPE_OPTIONS,
  FISH_SPECIES_OPTIONS,
  GENDER_OPTIONS,
  POND_TYPE_OPTIONS,
  WATER_SOURCE_OPTIONS,
} from '@fishmaster/shared-types';
import { Card, btnStyle, inputStyle } from '../../components/Shell';
import { registerFarm, setAuth } from '../../lib/api';

const defaultForm = {
  email: '',
  password: '',
  farmerName: '',
  surname: '',
  gender: '',
  ageRange: '',
  phone: '',
  postcode: '',
  lga: '',
  farmName: '',
  farmPhone: '',
  location: '',
  farmPostcode: '',
  farmLga: '',
  farmSizeSqM: '',
  totalPonds: '1',
  latitude: '',
  longitude: '',
  city: '',
  state: '',
  country: '',
  pondName: '',
  pondNumber: 1,
  pondType: '',
  lengthM: 2,
  widthM: 3,
  depthM: 1.3,
  cultureSystem: 'semi_intensive',
  fishSpecies: 'Catfish',
  quantityStocked: 2500,
  averageWeightAtStockingG: 8,
  fingerlingPrice: 30,
  stockingDate: new Date().toISOString().slice(0, 10),
  proposedSalesDate: '',
  feedName: '',
  feedType: '',
  feedMaker: '',
  feedBags: '',
  desiredCrudeProteinPct: 38,
  desiredFeedQuantityKg: 1500,
  waterSource: '',
  initialPh: '',
  initialDissolvedOxygenMgL: '',
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { cycleId, token } = await registerFarm(form);
      setAuth(token, cycleId, { role: 'member' });
      router.push('/');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ color: '#0d4f6e' }}>Register</h1>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Open to farmers worldwide. Most fields use dropdowns — tap to select.
      </p>
      <form onSubmit={submit} style={{ display: 'grid', gap: '1rem' }}>
        <Card title="Personal data">
          <Field label="Email" value={form.email} onChange={(v) => set('email', v)} type="email" required />
          <Field label="Password" value={form.password} onChange={(v) => set('password', v)} type="password" required />
          <Field label="First name" value={form.farmerName} onChange={(v) => set('farmerName', v)} required />
          <Field label="Surname" value={form.surname} onChange={(v) => set('surname', v)} />
          <Select label="Gender" value={form.gender} onChange={(v) => set('gender', v)} options={GENDER_OPTIONS} />
          <Select label="Age range" value={form.ageRange} onChange={(v) => set('ageRange', v)} options={AGE_RANGE_OPTIONS} />
          <Field label="Phone" value={form.phone} onChange={(v) => set('phone', v)} />
          <Field label="Postcode" value={form.postcode} onChange={(v) => set('postcode', v)} />
          <Field label="Local government area / borough" value={form.lga} onChange={(v) => set('lga', v)} />
          <Field label="State / region" value={form.state} onChange={(v) => set('state', v)} />
          <Field label="Country" value={form.country} onChange={(v) => set('country', v)} required placeholder="e.g. Nigeria, UK, Ghana" />
        </Card>

        <Card title="Farm">
          <Field label="Farm name" value={form.farmName} onChange={(v) => set('farmName', v)} required />
          <Field label="Farm phone" value={form.farmPhone} onChange={(v) => set('farmPhone', v)} />
          <Field label="Farm address / location" value={form.location} onChange={(v) => set('location', v)} />
          <Field label="Farm postcode" value={form.farmPostcode} onChange={(v) => set('farmPostcode', v)} />
          <Field label="Farm LGA / borough" value={form.farmLga} onChange={(v) => set('farmLga', v)} />
          <Field label="City" value={form.city} onChange={(v) => set('city', v)} />
          <Field label="Farm size (m²)" value={form.farmSizeSqM} onChange={(v) => set('farmSizeSqM', v)} type="number" />
          <Field label="Total number of ponds" value={form.totalPonds} onChange={(v) => set('totalPonds', v)} type="number" />
          <Field label="Latitude (optional)" value={form.latitude} onChange={(v) => set('latitude', v)} type="number" placeholder="e.g. 7.3775" />
          <Field label="Longitude (optional)" value={form.longitude} onChange={(v) => set('longitude', v)} type="number" placeholder="e.g. 3.9470" />
        </Card>

        <Card title="Pond">
          <Field label="Pond name" value={form.pondName} onChange={(v) => set('pondName', v)} required />
          <Field label="Pond number" value={String(form.pondNumber)} onChange={(v) => set('pondNumber', Number(v))} type="number" />
          <Select label="Pond type" value={form.pondType} onChange={(v) => set('pondType', v)} options={POND_TYPE_OPTIONS} />
          <Field label="Length (m)" value={String(form.lengthM)} onChange={(v) => set('lengthM', Number(v))} type="number" />
          <Field label="Width (m)" value={String(form.widthM)} onChange={(v) => set('widthM', Number(v))} type="number" />
          <Field label="Depth (m)" value={String(form.depthM)} onChange={(v) => set('depthM', Number(v))} type="number" />
          <Select
            label="Culture system"
            value={form.cultureSystem}
            onChange={(v) => set('cultureSystem', v)}
            options={CULTURE_SYSTEM_OPTIONS.map((o) => o.value)}
            labels={CULTURE_SYSTEM_OPTIONS.map((o) => o.label)}
          />
        </Card>

        <Card title="Fish stock">
          <Select label="Fish species" value={form.fishSpecies} onChange={(v) => set('fishSpecies', v)} options={FISH_SPECIES_OPTIONS} />
          <Field label="Quantity stocked" value={String(form.quantityStocked)} onChange={(v) => set('quantityStocked', Number(v))} type="number" />
          <Field label="Average weight @ stocking (g)" value={String(form.averageWeightAtStockingG)} onChange={(v) => set('averageWeightAtStockingG', Number(v))} type="number" />
          <Field label="Fingerling price" value={String(form.fingerlingPrice)} onChange={(v) => set('fingerlingPrice', Number(v))} type="number" />
          <Field label="Date of stocking" value={form.stockingDate} onChange={(v) => set('stockingDate', v)} type="date" />
          <Field label="Proposed date of sales" value={form.proposedSalesDate} onChange={(v) => set('proposedSalesDate', v)} type="date" />
        </Card>

        <Card title="Feed">
          <Field label="Feed name" value={form.feedName} onChange={(v) => set('feedName', v)} />
          <Select label="Feed type" value={form.feedType} onChange={(v) => set('feedType', v)} options={FEED_TYPE_OPTIONS} />
          <Field label="Feed maker" value={form.feedMaker} onChange={(v) => set('feedMaker', v)} />
          <Field label="Feed quantity (bags)" value={form.feedBags} onChange={(v) => set('feedBags', v)} type="number" />
          <Field label="Crude protein (%)" value={String(form.desiredCrudeProteinPct)} onChange={(v) => set('desiredCrudeProteinPct', Number(v))} type="number" />
        </Card>

        <Card title="Pond water (at setup)">
          <Select label="Water source" value={form.waterSource} onChange={(v) => set('waterSource', v)} options={WATER_SOURCE_OPTIONS} />
          <Field label="Initial pH (optional)" value={form.initialPh} onChange={(v) => set('initialPh', v)} type="number" />
          <Field label="Initial dissolved O₂ mg/L (optional)" value={form.initialDissolvedOxygenMgL} onChange={(v) => set('initialDissolvedOxygenMgL', v)} type="number" />
        </Card>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button type="submit" style={btnStyle} disabled={loading}>
          {loading ? 'Saving…' : 'Register & view dashboard'}
        </button>
      </form>
    </main>
  );
}

function Field({ label, value, onChange, type = 'text', required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label style={{ display: 'block', marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '0.85rem', color: '#555' }}>{label}</span>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
      />
    </label>
  );
}

function Select({ label, value, onChange, options, labels }: {
  label: string; value: string; onChange: (v: string) => void;
  options: readonly string[]; labels?: readonly string[];
}) {
  return (
    <label style={{ display: 'block', marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '0.85rem', color: '#555' }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
      >
        <option value="">— Select —</option>
        {options.map((opt, i) => (
          <option key={opt} value={opt}>{labels?.[i] ?? opt}</option>
        ))}
      </select>
    </label>
  );
}
