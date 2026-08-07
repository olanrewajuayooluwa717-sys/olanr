'use client';

import { useEffect, useState } from 'react';
import type { StockCycleReport } from '@fishmaster/shared-types';
import { TIER_LABELS } from '@fishmaster/shared-types';
import { Card, Flash, EmptyState, btnStyle, inputStyle } from '../components/Shell';
import { HomeIconGrid } from '../components/HomeIconGrid';
import { API_URL, fetchCycleReport, fetchReportFallback, authHeaders, fetchUserCycles, getToken, fetchDashboard } from '../lib/api';

type LogTab = 'feed' | 'mortality' | 'water' | 'power' | 'sales' | 'weight' | 'ops';

const LOG_TABS: { id: LogTab; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'mortality', label: 'Mortality' },
  { id: 'water', label: 'Water' },
  { id: 'power', label: 'Power' },
  { id: 'sales', label: 'Sales' },
  { id: 'weight', label: 'Weight' },
  { id: 'ops', label: 'Tasks' },
];

type FeedPost = { id: string; type: string; title: string; body: string; author: { name: string } };
type Dash = {
  dayInCulture: number;
  monthName: string;
  todayExpectedFeedKg: number | null;
  todayActualFeedKg: number | null;
  yesterdayExpectedFeedKg: number | null;
  todayMorningFeedKg: number | null;
  todayEveningFeedKg: number | null;
  expectedAvgWeightG: number | null;
  actualAvgWeightG: number | null;
  fishOnHand: number | null;
  month1FeedCost: number | null;
  cumulativeFeedCost: number | null;
  totalActualFeedKg: number | null;
  averageFcr: number | null;
  pondCleaning: {
    intervalDays: number;
    daysUntilNextCleaning: number;
    nextCleaningDayInCulture: number;
    dueToday: boolean;
  } | null;
};

type OpsLog = {
  medication: boolean;
  grading: boolean;
  netWash: boolean;
  pondCleaning: boolean;
  aerationCheck: boolean;
  waterExchange: boolean;
  sampling: boolean;
  notes: string;
};

export default function HomePage() {
  const [report, setReport] = useState<StockCycleReport | null>(null);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [pondName, setPondName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mortality, setMortality] = useState({ date: '', count: '' });
  const [feed, setFeed] = useState({ date: '', actualKg: '' });
  const [water, setWater] = useState({ date: '', ph: '', doMg: '', tempC: '', ammonia: '' });
  const [power, setPower] = useState({ date: '', electricityKwh: '', dieselLiters: '', petrolLiters: '', solarKwh: '' });
  const [sale, setSale] = useState({ date: '', quantitySold: '', avgWeightG: '', totalRevenue: '', customerName: '' });
  const [weight, setWeight] = useState({ date: '', averageWeightG: '' });
  const [ops, setOps] = useState<OpsLog & { date: string }>({
    date: '',
    medication: false,
    grading: false,
    netWash: false,
    pondCleaning: false,
    aerationCheck: false,
    waterExchange: false,
    sampling: false,
    notes: '',
  });
  const [news, setNews] = useState<FeedPost[]>([]);
  const [subscription, setSubscription] = useState<{ tierLabel: string; status: string } | null>(null);
  const [ponds, setPonds] = useState<{ id: string; label: string }[]>([]);
  const [dash, setDash] = useState<Dash | null>(null);
  const [logTab, setLogTab] = useState<LogTab>('feed');
  const [flash, setFlash] = useState<{ tone: 'ok' | 'warn' | 'info' | 'danger'; text: string } | null>(null);

  const showFlash = (tone: 'ok' | 'warn' | 'info' | 'danger', text: string) => {
    setFlash({ tone, text });
    window.setTimeout(() => setFlash(null), 4000);
  };

  const loadReport = (overrideCycleId?: string | null) => {
    const saved = overrideCycleId ?? localStorage.getItem('fishmaster_cycle_id');
    fetchCycleReport(saved)
      .then(({ report: r, cycleId: id, pondName: name }) => {
        setReport(r);
        setCycleId(id);
        setPondName(name);
        setError(null);
        if (id) fetchDashboard(id).then(setDash).catch(() => setDash(null));
      })
      .catch(() =>
        fetchReportFallback().then(({ report: r, pondName: name }) => {
          setReport(r);
          setPondName(name);
          setError('Offline mode — run setup.ps1 and restart API for full features.');
        }),
      )
      .catch((e) => setError(`API unreachable: ${e}`));
  };

  useEffect(loadReport, []);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setMortality((m) => ({ ...m, date: today }));
    setFeed((f) => ({ ...f, date: today }));
    setWater((w) => ({ ...w, date: today }));
    setPower((p) => ({ ...p, date: today }));
    setSale((s) => ({ ...s, date: today }));
    setWeight((w) => ({ ...w, date: today }));
    setOps((o) => ({ ...o, date: today }));
  }, []);
  useEffect(() => {
    fetch(`${API_URL}/api/content`).then((r) => r.json()).then(setNews).catch(() => {});
    if (getToken()) {
      fetch(`${API_URL}/api/billing/status`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => setSubscription({
          tierLabel: d.plan?.label ?? TIER_LABELS[d.tier] ?? d.tier,
          status: d.status,
        }))
        .catch(() => {});
      fetchUserCycles().then((cycles) =>
        setPonds(cycles.map((c) => ({
          id: c.id,
          label: `${c.pond.farm.name} · ${c.pond.name} (#${c.pond.number})`,
        }))),
      );
    }
  }, []);

  useEffect(() => {
    if (!cycleId || !ops.date) return;
    fetch(`${API_URL}/api/cycles/${cycleId}/operations`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((logs: (OpsLog & { date: string })[]) => {
        const todayLog = logs.find((l) => l.date.slice(0, 10) === ops.date);
        if (todayLog) {
          setOps((o) => ({
            ...o,
            medication: todayLog.medication,
            grading: todayLog.grading,
            netWash: todayLog.netWash,
            pondCleaning: todayLog.pondCleaning,
            aerationCheck: todayLog.aerationCheck,
            waterExchange: todayLog.waterExchange,
            sampling: todayLog.sampling,
            notes: todayLog.notes ?? '',
          }));
        }
      })
      .catch(() => {});
  }, [cycleId, ops.date]);

  const logMortality = async () => {
    if (!cycleId) return;
    await fetch(`${API_URL}/api/cycles/${cycleId}/mortality`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ date: mortality.date, count: Number(mortality.count) }),
    });
    loadReport();
    setMortality((m) => ({ ...m, count: '' }));
    showFlash('ok', 'Mortality recorded');
  };

  const logFeed = async () => {
    if (!cycleId) return;
    const res = await fetch(`${API_URL}/api/cycles/${cycleId}/feed`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ date: feed.date, actualKg: Number(feed.actualKg) }),
    });
    const data = await res.json();
    if (data.alert) {
      showFlash('warn', `${data.alert.type.toUpperCase()}: expected ${data.alert.expectedKg.toFixed(1)} kg, got ${data.alert.actualKg} kg`);
    } else {
      showFlash('ok', 'Feed logged');
    }
    loadReport();
    setFeed((f) => ({ ...f, actualKg: '' }));
  };

  const logPower = async () => {
    if (!cycleId) return;
    const body: Record<string, unknown> = { date: power.date };
    if (power.electricityKwh) body.electricityKwh = Number(power.electricityKwh);
    if (power.dieselLiters) body.dieselLiters = Number(power.dieselLiters);
    if (power.petrolLiters) body.petrolLiters = Number(power.petrolLiters);
    if (power.solarKwh) body.solarKwh = Number(power.solarKwh);
    await fetch(`${API_URL}/api/cycles/${cycleId}/power`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    showFlash('ok', 'Power consumption recorded');
    setPower((p) => ({ ...p, electricityKwh: '', dieselLiters: '', petrolLiters: '', solarKwh: '' }));
  };

  const logSale = async () => {
    if (!cycleId) return;
    await fetch(`${API_URL}/api/cycles/${cycleId}/sales`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        date: sale.date,
        quantitySold: Number(sale.quantitySold),
        avgWeightG: sale.avgWeightG ? Number(sale.avgWeightG) : undefined,
        totalRevenue: sale.totalRevenue ? Number(sale.totalRevenue) : undefined,
        customerName: sale.customerName || undefined,
      }),
    });
    showFlash('ok', 'Fish sale recorded');
    setSale((s) => ({ ...s, quantitySold: '', avgWeightG: '', totalRevenue: '', customerName: '' }));
    loadReport();
  };

  const logWeight = async () => {
    if (!cycleId) return;
    await fetch(`${API_URL}/api/cycles/${cycleId}/weight`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ date: weight.date, averageWeightG: Number(weight.averageWeightG) }),
    });
    showFlash('ok', 'Weight sample saved — see expected vs actual above');
    setWeight((w) => ({ ...w, averageWeightG: '' }));
    loadReport();
  };

  const logOps = async () => {
    if (!cycleId) return;
    await fetch(`${API_URL}/api/cycles/${cycleId}/operations`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        date: ops.date,
        medication: ops.medication,
        grading: ops.grading,
        netWash: ops.netWash,
        pondCleaning: ops.pondCleaning,
        aerationCheck: ops.aerationCheck,
        waterExchange: ops.waterExchange,
        sampling: ops.sampling,
        notes: ops.notes || undefined,
      }),
    });
    showFlash('ok', 'Daily tasks saved');
  };

  const logWater = async () => {
    if (!cycleId) return;
    const body: Record<string, unknown> = { date: water.date };
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
      showFlash('warn', data.alerts.map((a: { message: string }) => a.message).join(' · '));
    } else {
      showFlash('ok', 'Water parameters look good');
    }
    setWater((w) => ({ ...w, ph: '', doMg: '', tempC: '', ammonia: '' }));
  };

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '1.25rem 1.25rem 3rem' }}>
      <header style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ color: '#0d4f6e', margin: '0 0 0.35rem', fontSize: '1.5rem' }}>Farm dashboard</h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
          {pondName || 'Loading pond…'}
          {subscription && ` · ${subscription.tierLabel}`}
        </p>
        {ponds.length > 0 && cycleId && (
          <label style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.85rem', color: '#475569' }}>
            Active pond
            <select
              value={cycleId}
              onChange={(e) => { setCycleId(e.target.value); loadReport(e.target.value); }}
              style={{ display: 'block', marginTop: 4, width: '100%', maxWidth: 360, padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
            >
              {ponds.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
        )}
      </header>

      {error && <Flash tone="warn">{error}</Flash>}
      {flash && <Flash tone={flash.tone}>{flash.text}</Flash>}

      {dash && (
        <Card title={`Today · day ${dash.dayInCulture}`} subtitle={`${dash.monthName} · quick snapshot for this pond`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {dash.todayExpectedFeedKg != null && (
              <Metric label="Feed today" value={`${dash.todayExpectedFeedKg.toFixed(2)} kg`} hint={dash.todayActualFeedKg != null ? `Logged ${dash.todayActualFeedKg.toFixed(2)} kg` : 'Not logged yet'} />
            )}
            {dash.fishOnHand != null && <Metric label="Fish on hand" value={String(dash.fishOnHand)} />}
            {dash.expectedAvgWeightG != null && (
              <Metric
                label="Weight"
                value={`${dash.expectedAvgWeightG.toFixed(1)} g`}
                hint={dash.actualAvgWeightG != null ? `Actual ${dash.actualAvgWeightG.toFixed(1)} g` : 'No sample yet'}
              />
            )}
            {dash.averageFcr != null && <Metric label="FCR" value={dash.averageFcr.toFixed(2)} />}
            {dash.cumulativeFeedCost != null && <Metric label="Feed cost" value={`₦${dash.cumulativeFeedCost.toFixed(0)}`} />}
          </div>
          {dash.pondCleaning && (
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: dash.pondCleaning.dueToday ? '#c2410c' : '#64748b' }}>
              {dash.pondCleaning.dueToday
                ? 'Pond cleaning is due today'
                : `Next pond cleaning in ${dash.pondCleaning.daysUntilNextCleaning} days`}
            </p>
          )}
          <a href="/economics" style={{ color: '#0d4f6e', fontWeight: 600, fontSize: '0.9rem' }}>Full economics →</a>
        </Card>
      )}

      <div style={{ marginTop: '1.25rem' }}>
        <HomeIconGrid />
      </div>

      {news.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <Card title="Latest from Fishmaster" subtitle="Adverts and updates from the admin team">
            {news.slice(0, 3).map((n) => (
              <div key={n.id} style={{ borderTop: '1px solid #f1f5f9', padding: '0.65rem 0' }}>
                <strong style={{ color: '#0d4f6e', fontSize: '0.9rem' }}>{n.title}</strong>
                <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>{n.type}</span>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#64748b' }}>
                  {n.body.slice(0, 150)}{n.body.length > 150 ? '…' : ''}
                </p>
              </div>
            ))}
          </Card>
        </div>
      )}

      {report && cycleId && (
        <section style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <Stat label="Pond volume" value={`${report.advisedStocking.pondVolumeLiters.toFixed(0)} L`} />
            <Stat label="Month 1 feed" value={`${report.monthlyProjections[0].monthlyFeedKg.toFixed(0)} kg`} />
            <Stat label="Avg FCR" value={report.averageFcr.toFixed(2)} />
            <Stat label="6-mo feed" value={`${report.cycleFeedKg.months6.toFixed(0)} kg`} />
          </div>

          <Card title="Daily log" subtitle="Pick a tab, fill today’s values, then save — one job at a time">
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
              {LOG_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setLogTab(t.id)}
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 999,
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: logTab === t.id ? 600 : 400,
                    background: logTab === t.id ? '#0d4f6e' : '#f1f5f9',
                    color: logTab === t.id ? '#fff' : '#475569',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {logTab === 'feed' && (
              <LogForm hint="Compare what you fed with the expected gift above">
                <input type="date" style={inputStyle} value={feed.date} onChange={(e) => setFeed({ ...feed, date: e.target.value })} />
                <input type="number" style={inputStyle} placeholder="Actual feed (kg)" value={feed.actualKg} onChange={(e) => setFeed({ ...feed, actualKg: e.target.value })} />
                <button type="button" onClick={logFeed} style={btnStyle}>Save feed</button>
              </LogForm>
            )}
            {logTab === 'mortality' && (
              <LogForm hint="Enter fish lost today">
                <input type="date" style={inputStyle} value={mortality.date} onChange={(e) => setMortality({ ...mortality, date: e.target.value })} />
                <input type="number" style={inputStyle} placeholder="Count" value={mortality.count} onChange={(e) => setMortality({ ...mortality, count: e.target.value })} />
                <button type="button" onClick={logMortality} style={btnStyle}>Save mortality</button>
              </LogForm>
            )}
            {logTab === 'water' && (
              <LogForm hint="Targets: pH 6.5–8.5 · DO ≥5 · temp 25–30°C · ammonia &lt;0.5">
                <input type="date" style={inputStyle} value={water.date} onChange={(e) => setWater({ ...water, date: e.target.value })} />
                <input type="number" step="0.1" style={inputStyle} placeholder="pH" value={water.ph} onChange={(e) => setWater({ ...water, ph: e.target.value })} />
                <input type="number" step="0.1" style={inputStyle} placeholder="DO mg/L" value={water.doMg} onChange={(e) => setWater({ ...water, doMg: e.target.value })} />
                <input type="number" step="0.1" style={inputStyle} placeholder="°C" value={water.tempC} onChange={(e) => setWater({ ...water, tempC: e.target.value })} />
                <input type="number" step="0.01" style={inputStyle} placeholder="NH₃" value={water.ammonia} onChange={(e) => setWater({ ...water, ammonia: e.target.value })} />
                <button type="button" onClick={logWater} style={btnStyle}>Save & check</button>
              </LogForm>
            )}
            {logTab === 'power' && (
              <LogForm hint="Fill only what you used today">
                <input type="date" style={inputStyle} value={power.date} onChange={(e) => setPower({ ...power, date: e.target.value })} />
                <input type="number" step="0.1" style={inputStyle} placeholder="Electricity kWh" value={power.electricityKwh} onChange={(e) => setPower({ ...power, electricityKwh: e.target.value })} />
                <input type="number" step="0.1" style={inputStyle} placeholder="Diesel L" value={power.dieselLiters} onChange={(e) => setPower({ ...power, dieselLiters: e.target.value })} />
                <input type="number" step="0.1" style={inputStyle} placeholder="Petrol L" value={power.petrolLiters} onChange={(e) => setPower({ ...power, petrolLiters: e.target.value })} />
                <input type="number" step="0.1" style={inputStyle} placeholder="Solar kWh" value={power.solarKwh} onChange={(e) => setPower({ ...power, solarKwh: e.target.value })} />
                <button type="button" onClick={logPower} style={btnStyle}>Save power</button>
              </LogForm>
            )}
            {logTab === 'sales' && (
              <LogForm hint="Record a sale for economics tracking">
                <input type="date" style={inputStyle} value={sale.date} onChange={(e) => setSale({ ...sale, date: e.target.value })} />
                <input type="number" style={inputStyle} placeholder="Quantity sold" value={sale.quantitySold} onChange={(e) => setSale({ ...sale, quantitySold: e.target.value })} />
                <input type="number" step="0.1" style={inputStyle} placeholder="Avg weight (g)" value={sale.avgWeightG} onChange={(e) => setSale({ ...sale, avgWeightG: e.target.value })} />
                <input type="number" step="0.01" style={inputStyle} placeholder="Revenue (₦)" value={sale.totalRevenue} onChange={(e) => setSale({ ...sale, totalRevenue: e.target.value })} />
                <input type="text" style={inputStyle} placeholder="Customer" value={sale.customerName} onChange={(e) => setSale({ ...sale, customerName: e.target.value })} />
                <button type="button" onClick={logSale} style={btnStyle}>Save sale</button>
              </LogForm>
            )}
            {logTab === 'weight' && (
              <LogForm hint="Sample a few fish and enter the average weight">
                <input type="date" style={inputStyle} value={weight.date} onChange={(e) => setWeight({ ...weight, date: e.target.value })} />
                <input type="number" step="0.1" style={inputStyle} placeholder="Average weight (g)" value={weight.averageWeightG} onChange={(e) => setWeight({ ...weight, averageWeightG: e.target.value })} />
                <button type="button" onClick={logWeight} style={btnStyle}>Save weight</button>
              </LogForm>
            )}
            {logTab === 'ops' && (
              <>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.75rem' }}>Tick tasks you completed today</p>
                <input type="date" style={{ ...inputStyle, marginBottom: '0.65rem' }} value={ops.date} onChange={(e) => setOps({ ...ops, date: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {([
                    ['medication', 'Medication'],
                    ['grading', 'Grading'],
                    ['netWash', 'Net washing'],
                    ['pondCleaning', 'Pond cleaning'],
                    ['aerationCheck', 'Aeration check'],
                    ['waterExchange', 'Water exchange'],
                    ['sampling', 'Sampling'],
                  ] as const).map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', background: '#f8fafc', padding: '0.45rem 0.55rem', borderRadius: 8 }}>
                      <input type="checkbox" checked={ops[key]} onChange={(e) => setOps({ ...ops, [key]: e.target.checked })} />
                      {label}
                    </label>
                  ))}
                </div>
                <input type="text" style={{ ...inputStyle, width: '100%', maxWidth: '100%', boxSizing: 'border-box', marginBottom: '0.65rem' }} placeholder="Notes (optional)" value={ops.notes} onChange={(e) => setOps({ ...ops, notes: e.target.value })} />
                <button type="button" onClick={logOps} style={btnStyle}>Save tasks</button>
              </>
            )}
          </Card>
        </section>
      )}

      {!report && !error && (
        <EmptyState title="Loading your pond…" hint="If this takes long, check that the API is running on port 3001." />
      )}
    </main>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '0.75rem' }}>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0d4f6e' }}>{value}</div>
      {hint && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function LogForm({ hint, children }: { hint: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.75rem' }}>{hint}</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: '0.8rem', color: '#666' }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0d4f6e' }}>{value}</div>
    </div>
  );
}
