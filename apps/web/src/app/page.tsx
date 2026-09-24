'use client';

import { useEffect, useState } from 'react';
import type { StockCycleReport } from '@fishmaster/shared-types';
import { TIER_LABELS } from '@fishmaster/shared-types';
import { AppDisplayPage, type DisplayProfile } from '../components/AppDisplayPage';
import { PondLogSheet } from '../components/PondLogSheet';
import { EmptyState, Flash } from '../components/Shell';
import {
  API_URL,
  authHeaders,
  fetchCycleReport,
  fetchDashboard,
  fetchReportFallback,
  fetchUserCycles,
  getRole,
  getToken,
} from '../lib/api';

export default function HomePage() {
  const [report, setReport] = useState<StockCycleReport | null>(null);
  const [display, setDisplay] = useState<DisplayProfile | null>(null);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [pondName, setPondName] = useState('');
  const [ponds, setPonds] = useState<{ id: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [flash, setFlash] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const showFlash = (tone: 'ok' | 'warn', text: string) => {
    setFlash({ tone, text });
    window.setTimeout(() => setFlash(null), 4000);
  };

  const load = (overrideCycleId?: string | null) => {
    setLoading(true);
    const resolveId = async () => {
      if (overrideCycleId) return overrideCycleId;
      const saved = localStorage.getItem('fishmaster_cycle_id');
      if (saved) return saved;
      if (!getToken()) return null;
      const cycles = await fetchUserCycles();
      return cycles[0]?.id ?? null;
    };

    resolveId()
      .then((id) => fetchCycleReport(id))
      .then(({ report: r, cycleId: id, pondName: name, display: d }) => {
        setReport(r);
        setDisplay(d);
        setCycleId(id);
        setPondName(name);
        setError(null);
        if (id) {
          localStorage.setItem('fishmaster_cycle_id', id);
          fetchDashboard(id)
            .then((dash) => {
              const isStaff = getRole() === 'super_admin' || getRole() === 'manager';
              const bits: string[] = [];
              if (dash.dayInCulture) bits.push(`Day ${dash.dayInCulture}`);
              if (dash.todayExpectedFeedKg != null) {
                bits.push(
                  dash.todayActualFeedKg != null
                    ? `Fed ${dash.todayActualFeedKg.toFixed(1)} / ${dash.todayExpectedFeedKg.toFixed(1)} kg`
                    : `Feed due ${dash.todayExpectedFeedKg.toFixed(1)} kg`,
                );
              }
              if (dash.pondCleaning?.dueToday) bits.push('Cleaning due');
              else if (dash.pondCleaning) bits.push(`Clean in ${dash.pondCleaning.daysUntilNextCleaning} days`);
              if (isStaff && dash.averageFcr != null) bits.push(`FCR ${dash.averageFcr.toFixed(2)}`);
              setStatusNote(bits.join(' · ') || null);
            })
            .catch(() => setStatusNote(null));
        }
      })
      .catch(() =>
        fetchReportFallback().then(({ report: r, pondName: name }) => {
          setReport(r);
          setDisplay(null);
          setPondName(name);
          setError('Showing a sample pond — register or sign in for yours.');
        }),
      )
      .catch((e) =>
        setError(
          String(e).includes('waking') || String(e).includes('offline') || String(e).includes('rate-limiting')
            ? String(e).replace(/^Error:\s*/, '')
            : 'The API is offline right now. Wait a minute and refresh.',
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (getToken()) {
      fetchUserCycles()
        .then((cycles) =>
          setPonds(cycles.map((c) => ({
            id: c.id,
            label: `${c.pond.farm.name} · ${c.pond.name} (#${c.pond.number})`,
          }))),
        )
        .catch(() => {});
      fetch(`${API_URL}/api/billing/status`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => {
          const label = d.plan?.label ?? TIER_LABELS[d.tier];
          if (label) setStatusNote((prev) => prev ?? label);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onOpenLog = () => setLogOpen(true);
    const onSwitch = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) load(id);
    };
    window.addEventListener('fishmaster:open-log', onOpenLog);
    window.addEventListener('fishmaster:switch-pond', onSwitch);
    return () => {
      window.removeEventListener('fishmaster:open-log', onOpenLog);
      window.removeEventListener('fishmaster:switch-pond', onSwitch);
    };
  }, []);

  const afterLogSaved = () => {
    load(cycleId);
    window.dispatchEvent(new CustomEvent('fishmaster:refresh-today'));
  };

  return (
    <main className="phone-frame" style={{ background: '#fff', minHeight: '70vh' }}>
      {error && <div style={{ padding: '8px 16px 0' }}><Flash tone="warn">{error}</Flash></div>}
      {flash && <div style={{ padding: '8px 16px 0' }}><Flash tone={flash.tone}>{flash.text}</Flash></div>}
      {loading && !report && <EmptyState title="Loading your pond…" hint="Pulling the latest cycle." />}
      {report && (
        <AppDisplayPage
          report={report}
          display={display}
          pondName={pondName}
          ponds={ponds}
          cycleId={cycleId}
          statusNote={statusNote}
          onLog={() => setLogOpen(true)}
          onSwitchPond={(id) => load(id)}
        />
      )}
      <PondLogSheet
        open={logOpen}
        cycleId={cycleId}
        onClose={() => setLogOpen(false)}
        onSaved={afterLogSaved}
        onMessage={showFlash}
      />
    </main>
  );
}
