'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, btnStyle, inputStyle } from '../../components/Shell';
import { registerFarm, setAuth } from '../../lib/api';

const defaultForm = {
  email: '',
  password: '',
  farmerName: '',
  farmName: '',
  location: '',
  city: '',
  state: '',
  country: 'Nigeria',
  pondName: '',
  pondNumber: 1,
  lengthM: 2,
  widthM: 3,
  depthM: 1.3,
  quantityStocked: 2500,
  averageWeightAtStockingG: 8,
  fingerlingPrice: 30,
  stockingDate: new Date().toISOString().slice(0, 10),
  desiredCrudeProteinPct: 38,
  desiredFeedQuantityKg: 1500,
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
      const { cycleId, token, userId } = await registerFarm(form);
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
      <h1 style={{ color: '#0d4f6e' }}>Register farm & pond</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: '1rem' }}>
        <Card title="Farmer">
          <Field label="Email" value={form.email} onChange={(v) => set('email', v)} type="email" required />
          <Field label="Password" value={form.password} onChange={(v) => set('password', v)} type="password" required />
          <Field label="Name" value={form.farmerName} onChange={(v) => set('farmerName', v)} required />
        </Card>
        <Card title="Farm">
          <Field label="Farm name" value={form.farmName} onChange={(v) => set('farmName', v)} required />
          <Field label="Location" value={form.location} onChange={(v) => set('location', v)} />
          <Field label="City" value={form.city} onChange={(v) => set('city', v)} />
          <Field label="State" value={form.state} onChange={(v) => set('state', v)} />
          <Field label="Country" value={form.country} onChange={(v) => set('country', v)} />
        </Card>
        <Card title="Pond & stocking">
          <Field label="Pond name" value={form.pondName} onChange={(v) => set('pondName', v)} required />
          <Field label="Pond number" value={String(form.pondNumber)} onChange={(v) => set('pondNumber', Number(v))} type="number" />
          <Field label="Length (m)" value={String(form.lengthM)} onChange={(v) => set('lengthM', Number(v))} type="number" />
          <Field label="Width (m)" value={String(form.widthM)} onChange={(v) => set('widthM', Number(v))} type="number" />
          <Field label="Depth (m)" value={String(form.depthM)} onChange={(v) => set('depthM', Number(v))} type="number" />
          <Field label="Qty stocked" value={String(form.quantityStocked)} onChange={(v) => set('quantityStocked', Number(v))} type="number" />
          <Field label="Avg weight @ stocking (g)" value={String(form.averageWeightAtStockingG)} onChange={(v) => set('averageWeightAtStockingG', Number(v))} type="number" />
          <Field label="Stocking date" value={form.stockingDate} onChange={(v) => set('stockingDate', v)} type="date" />
        </Card>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button type="submit" style={btnStyle} disabled={loading}>
          {loading ? 'Saving…' : 'Register & view dashboard'}
        </button>
      </form>
    </main>
  );
}

function Field({ label, value, onChange, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <label style={{ display: 'block', marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '0.85rem', color: '#555' }}>{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
      />
    </label>
  );
}
