'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FEED_INGREDIENT_NAMES, MISC_COST_CATEGORIES } from '@fishmaster/shared-types';
import { Card, btnStyle, inputStyle } from '../../components/Shell';
import {
  addMiscCost,
  fetchEconomics,
  fetchFeedIngredients,
  fetchSales,
  fetchUserCycles,
  getToken,
  saveFeedIngredients,
  setCycleId,
  type EconomicsSummary,
  type FeedIngredient,
  type FishSale,
} from '../../lib/api';

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return `₦${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function EconomicsPage() {
  const [cycleId, setCycleIdState] = useState<string | null>(null);
  const [ponds, setPonds] = useState<{ id: string; label: string }[]>([]);
  const [summary, setSummary] = useState<EconomicsSummary | null>(null);
  const [sales, setSales] = useState<FishSale[]>([]);
  const [ingredients, setIngredients] = useState<{ ingredientName: string; costPerKg: string }[]>([]);
  const [misc, setMisc] = useState({ date: '', category: 'salary', amount: '', notes: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (id: string) => {
    try {
      const [econ, saleList, ingList] = await Promise.all([
        fetchEconomics(id),
        fetchSales(id),
        fetchFeedIngredients(id),
      ]);
      setSummary(econ);
      setSales(saleList);
      const ingMap = new Map(ingList.map((i: FeedIngredient) => [i.ingredientName, String(i.costPerKg)]));
      setIngredients(
        FEED_INGREDIENT_NAMES.map((name) => ({
          ingredientName: name,
          costPerKg: ingMap.get(name) ?? '',
        })),
      );
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setMisc((m) => ({ ...m, date: today }));
    if (!getToken()) return;
    const saved = localStorage.getItem('fishmaster_cycle_id');
    fetchUserCycles().then((cycles) => {
      setPonds(cycles.map((c) => ({
        id: c.id,
        label: `${c.pond.farm.name} · ${c.pond.name} (#${c.pond.number})`,
      })));
      const id = saved && cycles.some((c) => c.id === saved) ? saved : cycles[0]?.id;
      if (id) {
        setCycleIdState(id);
        load(id);
      }
    });
  }, []);

  const switchPond = (id: string) => {
    setCycleId(id);
    setCycleIdState(id);
    load(id);
  };

  const saveIngredients = async () => {
    if (!cycleId) return;
    const items = ingredients
      .filter((i) => i.costPerKg !== '')
      .map((i) => ({ ingredientName: i.ingredientName, costPerKg: Number(i.costPerKg) }));
    await saveFeedIngredients(cycleId, items);
    setMsg('Ingredient costs saved');
    load(cycleId);
  };

  const submitMisc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleId) return;
    await addMiscCost(cycleId, {
      date: misc.date,
      category: misc.category,
      amount: Number(misc.amount),
      notes: misc.notes || undefined,
    });
    setMisc((m) => ({ ...m, amount: '', notes: '' }));
    setMsg('Misc cost added');
    load(cycleId);
  };

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#0d4f6e', margin: '0 0 0.25rem' }}>Economics</h1>
        <p style={{ color: '#555', margin: 0 }}>
          Combined cost summary — feed, power, misc &amp; sales
          {summary && ` · ${summary.pondName}`}
        </p>
        {ponds.length > 1 && cycleId && (
          <select
            value={cycleId}
            onChange={(e) => switchPond(e.target.value)}
            style={{ marginTop: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid #ccc' }}
          >
            {ponds.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        )}
        <p style={{ marginTop: '0.5rem' }}>
          <Link href="/" style={{ color: '#0d4f6e' }}>← Back to dashboard</Link>
        </p>
      </header>

      {error && <p style={{ color: '#b45309' }}>{error}</p>}
      {msg && <p style={{ color: '#15803d', fontWeight: 600 }}>{msg}</p>}

      {summary && (
        <Card title="Combined summary">
          <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>Cumulative feed cost</td>
                <td align="right" style={{ padding: '0.5rem', fontWeight: 600 }}>{fmt(summary.cumulativeFeedCost)}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>
                  Power cost estimate
                  <br />
                  <small style={{ color: '#888' }}>
                    ₦{summary.powerRates.electricityPerKwh}/kWh · ₦{summary.powerRates.dieselPerLiter}/L diesel · ₦{summary.powerRates.petrolPerLiter}/L petrol
                  </small>
                </td>
                <td align="right" style={{ padding: '0.5rem', fontWeight: 600 }}>{fmt(summary.powerCostEstimate)}</td>
              </tr>
              {Object.entries(summary.miscCostsByCategory).map(([cat, amt]) => (
                <tr key={cat} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem', textTransform: 'capitalize' }}>Misc — {cat}</td>
                  <td align="right" style={{ padding: '0.5rem' }}>{fmt(amt)}</td>
                </tr>
              ))}
              {summary.miscCostsTotal > 0 && (
                <tr style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>Misc costs total</td>
                  <td align="right" style={{ padding: '0.5rem', fontWeight: 600 }}>{fmt(summary.miscCostsTotal)}</td>
                </tr>
              )}
              <tr style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem', fontWeight: 600 }}>Total costs</td>
                <td align="right" style={{ padding: '0.5rem', fontWeight: 600 }}>{fmt(summary.totalCosts)}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>Sales revenue</td>
                <td align="right" style={{ padding: '0.5rem', fontWeight: 600, color: '#15803d' }}>{fmt(summary.salesRevenue)}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #0d4f6e' }}>
                <td style={{ padding: '0.5rem', fontWeight: 700 }}>Profit / loss</td>
                <td align="right" style={{
                  padding: '0.5rem', fontWeight: 700,
                  color: summary.profitLoss >= 0 ? '#15803d' : '#b91c1c',
                }}>
                  {fmt(summary.profitLoss)}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      <section style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        <Card title="Sales history">
          {sales.length === 0 ? (
            <p style={{ color: '#888', margin: 0 }}>No sales logged yet. Record sales from the dashboard daily log.</p>
          ) : (
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th align="left" style={{ padding: '0.5rem' }}>Date</th>
                  <th align="right" style={{ padding: '0.5rem' }}>Qty</th>
                  <th align="right" style={{ padding: '0.5rem' }}>Avg wt (g)</th>
                  <th align="right" style={{ padding: '0.5rem' }}>Revenue</th>
                  <th align="left" style={{ padding: '0.5rem' }}>Customer</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: '0.5rem' }}>{s.date.slice(0, 10)}</td>
                    <td align="right" style={{ padding: '0.5rem' }}>{s.quantitySold}</td>
                    <td align="right" style={{ padding: '0.5rem' }}>{s.avgWeightG?.toFixed(0) ?? '—'}</td>
                    <td align="right" style={{ padding: '0.5rem' }}>{fmt(s.totalRevenue)}</td>
                    <td style={{ padding: '0.5rem' }}>{s.customerName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {cycleId && (
          <>
            <Card title="Feed ingredient costs (₦/kg)">
              <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 0.75rem' }}>
                Scaffold for Excel ingredient matrix — set costs per kg for formulation estimates.
              </p>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {ingredients.map((row, i) => (
                  <div key={row.ingredientName} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ flex: 1, fontSize: '0.9rem' }}>{row.ingredientName}</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="₦/kg"
                      value={row.costPerKg}
                      onChange={(e) => {
                        const next = [...ingredients];
                        next[i] = { ...row, costPerKg: e.target.value };
                        setIngredients(next);
                      }}
                      style={{ ...inputStyle, width: 120 }}
                    />
                  </div>
                ))}
              </div>
              <button onClick={saveIngredients} style={{ ...btnStyle, marginTop: '0.75rem' }}>Save ingredient costs</button>
            </Card>

            <Card title="Add misc cost">
              <form onSubmit={submitMisc} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <input type="date" required value={misc.date} onChange={(e) => setMisc({ ...misc, date: e.target.value })} style={inputStyle} />
                <select value={misc.category} onChange={(e) => setMisc({ ...misc, category: e.target.value })} style={inputStyle}>
                  {MISC_COST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input type="number" required placeholder="Amount ₦" value={misc.amount} onChange={(e) => setMisc({ ...misc, amount: e.target.value })} style={inputStyle} />
                <input type="text" placeholder="Notes" value={misc.notes} onChange={(e) => setMisc({ ...misc, notes: e.target.value })} style={inputStyle} />
                <button type="submit" style={btnStyle}>Add</button>
              </form>
            </Card>
          </>
        )}
      </section>
    </main>
  );
}
