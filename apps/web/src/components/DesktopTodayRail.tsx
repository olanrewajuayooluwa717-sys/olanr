'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { DailyFeedChartRow } from '@fishmaster/shared-types';
import {
  fetchCycleReport,
  fetchDashboard,
  fetchUserCycles,
  getToken,
  setCycleId,
} from '../lib/api';

type TodayBits = {
  cycleId: string | null;
  farmName: string;
  pondLabel: string;
  species: string | null;
  morningG: number | null;
  eveningG: number | null;
  dayInCycle: number | null;
  feedDueKg: number | null;
  fedKg: number | null;
  note: string | null;
  activities: string[];
};

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function openPondLog() {
  window.dispatchEvent(new CustomEvent('fishmaster:open-log'));
}

export function switchPond(id: string) {
  setCycleId(id);
  window.dispatchEvent(new CustomEvent('fishmaster:switch-pond', { detail: { id } }));
}

export function DesktopTodayRail() {
  const pathname = usePathname() ?? '/';
  const [loggedIn, setLoggedIn] = useState(false);
  const [ponds, setPonds] = useState<{ id: string; label: string }[]>([]);
  const [today, setToday] = useState<TodayBits | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = !!getToken();
    setLoggedIn(token);
    if (!token) {
      setToday(null);
      setPonds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const cycles = await fetchUserCycles();
      const pondList = cycles.map((c) => ({
        id: c.id,
        label: `${c.pond.farm.name} · ${c.pond.name}`,
      }));
      setPonds(pondList);

      const saved = localStorage.getItem('fishmaster_cycle_id');
      const { report, cycleId, pondName, display } = await fetchCycleReport(saved);
      if (cycleId) setCycleId(cycleId);

      const todayDate = new Date();
      const row =
        report.dailyFeedCharts.flat().find((r: DailyFeedChartRow) => sameDay(new Date(r.date), todayDate)) ?? null;

      let feedDueKg: number | null = null;
      let fedKg: number | null = null;
      let dayInCulture: number | null = row?.dayInCycle ?? null;
      let note: string | null = null;
      let activities: string[] = [];

      if (cycleId) {
        try {
          const dash = await fetchDashboard(cycleId);
          feedDueKg = dash.todayExpectedFeedKg ?? null;
          fedKg = dash.todayActualFeedKg ?? null;
          if (dash.dayInCulture) dayInCulture = dash.dayInCulture;
          if (dash.pondCleaning?.dueToday) note = 'Cleaning due today';
          else if (dash.pondCleaning?.daysUntilNextCleaning != null) {
            note = `Clean in ${dash.pondCleaning.daysUntilNextCleaning} days`;
          }
          if (Array.isArray(dash.todayActivities)) activities = dash.todayActivities;
        } catch {
          /* rail still useful without dashboard */
        }
      }

      setToday({
        cycleId,
        farmName: display?.farmName || pondName || 'Your farm',
        pondLabel: display?.pond.name || pondName || 'Pond',
        species: display?.stock.fishSpecies ?? null,
        morningG: row?.morningFeedG ?? null,
        eveningG: row?.eveningFeedG ?? null,
        dayInCycle: dayInCulture,
        feedDueKg,
        fedKg,
        note,
        activities,
      });
    } catch {
      setToday(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname]);

  useEffect(() => {
    const onRefresh = () => load();
    window.addEventListener('fishmaster:refresh-today', onRefresh);
    return () => window.removeEventListener('fishmaster:refresh-today', onRefresh);
  }, [load]);

  if (!loggedIn) {
    return (
      <aside className="member-rail" aria-label="Today">
        <div className="rail-card">
          <p className="rail-kicker">Today</p>
          <h2 className="rail-title">Your daily log</h2>
          <p className="rail-copy">Sign in to see today’s ration, switch ponds, and record activities.</p>
          <Link href="/login" className="rail-primary">Sign in</Link>
          <Link href="/register" className="rail-ghost">Register</Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className="member-rail" aria-label="Today">
      <div className="rail-card">
        <p className="rail-kicker">Today</p>
        {loading && !today ? (
          <p className="rail-copy">Loading pond…</p>
        ) : today ? (
          <>
            <h2 className="rail-title">{today.farmName}</h2>
            <p className="rail-meta">
              {today.pondLabel}
              {today.species ? ` · ${today.species}` : ''}
              {today.dayInCycle != null ? ` · Day ${today.dayInCycle}` : ''}
            </p>

            <div className="rail-rations">
              <div>
                <span className="rail-label">Chart</span>
                <strong>
                  {today.feedDueKg != null
                    ? `${today.feedDueKg.toFixed(2)} kg`
                    : today.morningG != null && today.eveningG != null
                      ? `${((today.morningG + today.eveningG) / 1000).toFixed(2)} kg`
                      : '—'}
                </strong>
              </div>
              <div>
                <span className="rail-label">Logged</span>
                <strong>{today.fedKg != null ? `${today.fedKg.toFixed(2)} kg` : '—'}</strong>
              </div>
            </div>

            {(today.morningG != null || today.eveningG != null) && (
              <p className="rail-copy">
                Morning {today.morningG != null ? `${today.morningG.toFixed(0)} g` : '—'}
                {' · '}
                Evening {today.eveningG != null ? `${today.eveningG.toFixed(0)} g` : '—'}
              </p>
            )}
            {today.note && <p className="rail-note">{today.note}</p>}
            {today.activities.length > 0 ? (
              <p className="rail-copy">
                <strong>Today’s activities:</strong> {today.activities.join(' · ')}
              </p>
            ) : (
              <p className="rail-copy">No activities logged today.</p>
            )}

            <button type="button" className="rail-primary" onClick={openPondLog}>
              Daily log
            </button>

            {ponds.length > 1 && today.cycleId && (
              <label className="rail-pond">
                <span className="rail-label">Pond</span>
                <select
                  value={today.cycleId}
                  onChange={(e) => {
                    switchPond(e.target.value);
                    window.setTimeout(load, 50);
                  }}
                >
                  {ponds.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </label>
            )}
          </>
        ) : (
          <>
            <h2 className="rail-title">No active pond</h2>
            <p className="rail-copy">Register a farm cycle to unlock today’s feed plan.</p>
            <Link href="/register" className="rail-primary">Add farm</Link>
          </>
        )}
      </div>

      <div className="rail-card rail-card-soft">
        <p className="rail-kicker">Quick</p>
        <Link href="/content/video" className="rail-link">Videos</Link>
        <Link href="/marketplace" className="rail-link">Marketplace</Link>
        <Link href="/reports" className="rail-link">Reports</Link>
      </div>
    </aside>
  );
}
