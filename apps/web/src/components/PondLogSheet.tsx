'use client';

import { useEffect, useState } from 'react';
import { API_URL, authHeaders } from '../lib/api';

type LogTab = 'feed' | 'mortality' | 'water' | 'power' | 'sales' | 'weight' | 'ops';

const TABS: { id: LogTab; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'mortality', label: 'Deaths' },
  { id: 'water', label: 'Water' },
  { id: 'weight', label: 'Weight' },
  { id: 'ops', label: 'Tasks' },
  { id: 'power', label: 'Power' },
  { id: 'sales', label: 'Sales' },
];

type Ops = {
  medication: boolean;
  grading: boolean;
  netWash: boolean;
  pondCleaning: boolean;
  aerationCheck: boolean;
  waterExchange: boolean;
  sampling: boolean;
  notes: string;
};

export function PondLogSheet({
  open,
  cycleId,
  onClose,
  onSaved,
  onMessage,
}: {
  open: boolean;
  cycleId: string | null;
  onClose: () => void;
  onSaved: () => void;
  onMessage: (tone: 'ok' | 'warn', text: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState<LogTab>('feed');
  const [date, setDate] = useState(today);
  const [actualKg, setActualKg] = useState('');
  const [deaths, setDeaths] = useState('');
  const [water, setWater] = useState({ ph: '', doMg: '', tempC: '', ammonia: '' });
  const [weightG, setWeightG] = useState('');
  const [power, setPower] = useState({ electricityKwh: '', dieselLiters: '', petrolLiters: '', solarKwh: '' });
  const [sale, setSale] = useState({ quantitySold: '', avgWeightG: '', totalRevenue: '', customerName: '' });
  const [ops, setOps] = useState<Ops>({
    medication: false, grading: false, netWash: false, pondCleaning: false,
    aerationCheck: false, waterExchange: false, sampling: false, notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !cycleId) return;
    fetch(`${API_URL}/api/cycles/${cycleId}/operations`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((logs: (Ops & { date: string })[]) => {
        const hit = logs.find((l) => l.date.slice(0, 10) === date);
        if (!hit) return;
        setOps({
          medication: hit.medication,
          grading: hit.grading,
          netWash: hit.netWash,
          pondCleaning: hit.pondCleaning,
          aerationCheck: hit.aerationCheck,
          waterExchange: hit.waterExchange,
          sampling: hit.sampling,
          notes: hit.notes ?? '',
        });
      })
      .catch(() => {});
  }, [open, cycleId, date]);

  if (!open) return null;

  const save = async () => {
    if (!cycleId) {
      onMessage('warn', 'Select a pond before logging.');
      return;
    }
    setSaving(true);
    try {
      if (tab === 'feed') {
        const res = await fetch(`${API_URL}/api/cycles/${cycleId}/feed`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ date, actualKg: Number(actualKg) }),
        });
        const data = await res.json();
        if (data.alert) {
          onMessage('warn', `${data.alert.type}: expected ${data.alert.expectedKg.toFixed(1)} kg, logged ${data.alert.actualKg} kg`);
        } else {
          onMessage('ok', 'Feed logged');
        }
        setActualKg('');
      } else if (tab === 'mortality') {
        await fetch(`${API_URL}/api/cycles/${cycleId}/mortality`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ date, count: Number(deaths) }),
        });
        setDeaths('');
        onMessage('ok', 'Mortality recorded');
      } else if (tab === 'water') {
        const body: Record<string, unknown> = { date };
        if (water.ph) body.ph = Number(water.ph);
        if (water.doMg) body.dissolvedOxygenMgL = Number(water.doMg);
        if (water.tempC) body.temperatureC = Number(water.tempC);
        if (water.ammonia) body.ammoniaMgL = Number(water.ammonia);
        const res = await fetch(`${API_URL}/api/cycles/${cycleId}/water`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.alerts?.length) {
          onMessage('warn', data.alerts.map((a: { message: string }) => a.message).join(' · '));
        } else {
          onMessage('ok', 'Water looks good');
        }
        setWater({ ph: '', doMg: '', tempC: '', ammonia: '' });
      } else if (tab === 'weight') {
        await fetch(`${API_URL}/api/cycles/${cycleId}/weight`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ date, averageWeightG: Number(weightG) }),
        });
        setWeightG('');
        onMessage('ok', 'Weight sample saved');
      } else if (tab === 'power') {
        const body: Record<string, unknown> = { date };
        if (power.electricityKwh) body.electricityKwh = Number(power.electricityKwh);
        if (power.dieselLiters) body.dieselLiters = Number(power.dieselLiters);
        if (power.petrolLiters) body.petrolLiters = Number(power.petrolLiters);
        if (power.solarKwh) body.solarKwh = Number(power.solarKwh);
        await fetch(`${API_URL}/api/cycles/${cycleId}/power`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        setPower({ electricityKwh: '', dieselLiters: '', petrolLiters: '', solarKwh: '' });
        onMessage('ok', 'Power recorded');
      } else if (tab === 'sales') {
        await fetch(`${API_URL}/api/cycles/${cycleId}/sales`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            date,
            quantitySold: Number(sale.quantitySold),
            avgWeightG: sale.avgWeightG ? Number(sale.avgWeightG) : undefined,
            totalRevenue: sale.totalRevenue ? Number(sale.totalRevenue) : undefined,
            customerName: sale.customerName || undefined,
          }),
        });
        setSale({ quantitySold: '', avgWeightG: '', totalRevenue: '', customerName: '' });
        onMessage('ok', 'Sale recorded');
      } else {
        await fetch(`${API_URL}/api/cycles/${cycleId}/operations`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ date, ...ops, notes: ops.notes || undefined }),
        });
        onMessage('ok', 'Tasks saved');
      }
      onSaved();
    } catch (e) {
      onMessage('warn', String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose} role="presentation">
      <div className="phone-frame" style={sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Log today">
        <div style={{ width: 36, height: 4, borderRadius: 99, background: '#e5e5e5', margin: '0 auto 12px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <strong>Log today</strong>
          <button type="button" onClick={onClose} style={ghost}>Close</button>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                border: 'none',
                cursor: 'pointer',
                borderRadius: 999,
                padding: '7px 12px',
                fontSize: '0.8rem',
                fontWeight: tab === t.id ? 700 : 500,
                background: tab === t.id ? '#0d4f6e' : '#f5f5f5',
                color: tab === t.id ? '#fff' : '#525252',
                flex: '0 0 auto',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label style={field}>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={input} />
        </label>
        {tab === 'feed' && <Field label="Actual feed (kg)" value={actualKg} onChange={setActualKg} />}
        {tab === 'mortality' && <Field label="Fish lost" value={deaths} onChange={setDeaths} />}
        {tab === 'water' && (
          <>
            <Field label="pH (4.5–10)" value={water.ph} onChange={(v) => setWater({ ...water, ph: v })} />
            <Field label="Dissolved oxygen mg/L" value={water.doMg} onChange={(v) => setWater({ ...water, doMg: v })} />
            <Field label="Temperature °C" value={water.tempC} onChange={(v) => setWater({ ...water, tempC: v })} />
            <Field label="Ammonia" value={water.ammonia} onChange={(v) => setWater({ ...water, ammonia: v })} />
          </>
        )}
        {tab === 'weight' && <Field label="Average weight (g)" value={weightG} onChange={setWeightG} />}
        {tab === 'power' && (
          <>
            <Field label="Electricity kWh" value={power.electricityKwh} onChange={(v) => setPower({ ...power, electricityKwh: v })} />
            <Field label="Diesel litres" value={power.dieselLiters} onChange={(v) => setPower({ ...power, dieselLiters: v })} />
            <Field label="Petrol litres" value={power.petrolLiters} onChange={(v) => setPower({ ...power, petrolLiters: v })} />
            <Field label="Solar kWh" value={power.solarKwh} onChange={(v) => setPower({ ...power, solarKwh: v })} />
          </>
        )}
        {tab === 'sales' && (
          <>
            <Field label="Quantity sold" value={sale.quantitySold} onChange={(v) => setSale({ ...sale, quantitySold: v })} />
            <Field label="Average weight (g)" value={sale.avgWeightG} onChange={(v) => setSale({ ...sale, avgWeightG: v })} />
            <Field label="Revenue" value={sale.totalRevenue} onChange={(v) => setSale({ ...sale, totalRevenue: v })} />
            <label style={field}>
              Customer
              <input value={sale.customerName} onChange={(e) => setSale({ ...sale, customerName: e.target.value })} style={input} />
            </label>
          </>
        )}
        {tab === 'ops' && (
          <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
            {([
              ['medication', 'Medication'],
              ['grading', 'Grading'],
              ['netWash', 'Net wash'],
              ['pondCleaning', 'Pond cleaning'],
              ['aerationCheck', 'Aeration'],
              ['waterExchange', 'Water exchange'],
              ['sampling', 'Sampling'],
            ] as const).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', gap: 8, fontSize: '0.9rem' }}>
                <input type="checkbox" checked={ops[key]} onChange={(e) => setOps({ ...ops, [key]: e.target.checked })} />
                {label}
              </label>
            ))}
            <input
              placeholder="Notes"
              value={ops.notes}
              onChange={(e) => setOps({ ...ops, notes: e.target.value })}
              style={input}
            />
          </div>
        )}
        <button type="button" onClick={save} disabled={saving} style={saveBtn}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={field}>
      {label}
      <input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} style={input} />
    </label>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 40,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
};

const sheet: React.CSSProperties = {
  width: '100%',
  maxHeight: '88vh',
  overflowY: 'auto',
  background: '#fff',
  borderRadius: '18px 18px 0 0',
  padding: '10px 16px 24px',
  boxSizing: 'border-box',
};

const field: React.CSSProperties = { display: 'block', fontSize: '0.78rem', color: '#737373', marginBottom: 10 };
const input: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #e5e5e5',
  fontSize: '1rem',
};
const saveBtn: React.CSSProperties = {
  width: '100%',
  border: 'none',
  borderRadius: 12,
  background: '#0d4f6e',
  color: '#fff',
  fontWeight: 700,
  padding: '12px',
  cursor: 'pointer',
  fontSize: '0.95rem',
};
const ghost: React.CSSProperties = { border: 'none', background: 'transparent', color: '#737373', cursor: 'pointer' };
