'use client';

import { useEffect, useState } from 'react';
import type { StockCycleReport } from '@fishmaster/shared-types';
import { Card, btnStyle, inputStyle } from '../components/Shell';
import { API_URL, fetchCycleReport, fetchReportFallback, authHeaders } from '../lib/api';

type FeedPost = { id: string; type: string; title: string; body: string; author: { name: string } };

export default function HomePage() {
  const [report, setReport] = useState<StockCycleReport | null>(null);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [pondName, setPondName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mortality, setMortality] = useState({ date: '', count: '' });
  const [feed, setFeed] = useState({ date: '', actualKg: '' });
  const [water, setWater] = useState({ date: '', ph: '', doMg: '', tempC: '', ammonia: '' });
  const [waterAlert, setWaterAlert] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [news, setNews] = useState<FeedPost[]>([]);
  const [subscription, setSubscription] = useState<{ tier: string; status: string } | null>(null);

  const loadReport = () => {
    const saved = localStorage.getItem('fishmaster_cycle_id');
    fetchCycleReport(saved)
      .then(({ report: r, cycleId: id, pondName: name }) => {
        setReport(r);
        setCycleId(id);
        setPondName(name);
        setError(null);
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
  }, []);
  useEffect(() => {
    fetch(`${API_URL}/api/content`).then((r) => r.json()).then(setNews).catch(() => {});
    if (localStorage.getItem('fishmaster_token')) {
      fetch(`${API_URL}/api/billing/status`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => setSubscription({ tier: d.tier, status: d.status }))
        .catch(() => {});
    }
  }, []);

  const logMortality = async () => {
    if (!cycleId) return;
    await fetch(`${API_URL}/api/cycles/${cycleId}/mortality`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ date: mortality.date, count: Number(mortality.count) }),
    });
    loadReport();
    setMortality({ date: '', count: '' });
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
      setAlert(`${data.alert.type.toUpperCase()}: expected ${data.alert.expectedKg.toFixed(1)} kg, got ${data.alert.actualKg} kg`);
    }
    loadReport();
    setFeed({ date: '', actualKg: '' });
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
      setWaterAlert(data.alerts.map((a: { message: string }) => a.message).join(' · '));
    } else {
      setWaterAlert('Water parameters look good');
    }
    setWater((w) => ({ ...w, ph: '', doMg: '', tempC: '', ammonia: '' }));
  };

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#0d4f6e', margin: '0 0 0.25rem' }}>Dashboard</h1>
        <p style={{ color: '#555', margin: 0 }}>
          {pondName || 'Loading…'}
          {subscription && ` · ${subscription.tier} (${subscription.status})`}
          {' · '}{new Date().toLocaleString(undefined, { month: 'long', hour: '2-digit', minute: '2-digit' })}
        </p>
      </header>

      {error && <p style={{ color: '#b45309' }}>{error}</p>}
      {alert && <p style={{ color: '#c2410c', fontWeight: 600, background: '#fff7ed', padding: '0.75rem', borderRadius: 8 }}>{alert}</p>}
      {waterAlert && <p style={{ color: '#0369a1', fontWeight: 600, background: '#e0f2fe', padding: '0.75rem', borderRadius: 8 }}>{waterAlert}</p>}

      {news.length > 0 && (
        <Card title="News & Education">
          {news.slice(0, 3).map((n) => (
            <div key={n.id} style={{ borderTop: '1px solid #eee', padding: '0.5rem 0' }}>
              <strong style={{ color: '#0d4f6e' }}>[{n.type}] {n.title}</strong>
              <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#555' }}>{n.body.slice(0, 150)}{n.body.length > 150 ? '…' : ''}</p>
            </div>
          ))}
        </Card>
      )}

      {report && (
        <>
          <section style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <Stat label="Pond volume" value={`${report.advisedStocking.pondVolumeLiters.toFixed(0)} L`} />
              <Stat label="Month 1 feed" value={`${report.monthlyProjections[0].monthlyFeedKg.toFixed(0)} kg`} />
              <Stat label="Avg FCR" value={report.averageFcr.toFixed(2)} />
              <Stat label="6-mo feed" value={`${report.cycleFeedKg.months6.toFixed(0)} kg`} />
            </div>

            {cycleId && (
              <>
                <Card title="Log water quality">
                  <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 0.75rem' }}>Targets: pH 6.5–8.5 · DO ≥5 mg/L · temp 25–30°C · ammonia &lt;0.5</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input type="date" style={inputStyle} value={water.date} onChange={(e) => setWater({ ...water, date: e.target.value })} />
                    <input type="number" step="0.1" style={inputStyle} placeholder="pH" value={water.ph} onChange={(e) => setWater({ ...water, ph: e.target.value })} />
                    <input type="number" step="0.1" style={inputStyle} placeholder="DO mg/L" value={water.doMg} onChange={(e) => setWater({ ...water, doMg: e.target.value })} />
                    <input type="number" step="0.1" style={inputStyle} placeholder="°C" value={water.tempC} onChange={(e) => setWater({ ...water, tempC: e.target.value })} />
                    <input type="number" step="0.01" style={inputStyle} placeholder="NH₃ mg/L" value={water.ammonia} onChange={(e) => setWater({ ...water, ammonia: e.target.value })} />
                    <button onClick={logWater} style={btnStyle}>Save & check</button>
                  </div>
                </Card>
                <Card title="Log daily mortality">
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input type="date" style={inputStyle} value={mortality.date} onChange={(e) => setMortality({ ...mortality, date: e.target.value })} />
                    <input type="number" style={inputStyle} placeholder="Count" value={mortality.count} onChange={(e) => setMortality({ ...mortality, count: e.target.value })} />
                    <button onClick={logMortality} style={btnStyle}>Save</button>
                  </div>
                </Card>
                <Card title="Log actual feed">
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input type="date" style={inputStyle} value={feed.date} onChange={(e) => setFeed({ ...feed, date: e.target.value })} />
                    <input type="number" style={inputStyle} placeholder="kg" value={feed.actualKg} onChange={(e) => setFeed({ ...feed, actualKg: e.target.value })} />
                    <button onClick={logFeed} style={btnStyle}>Save & check</button>
                  </div>
                </Card>
              </>
            )}
          </section>
        </>
      )}
    </main>
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
