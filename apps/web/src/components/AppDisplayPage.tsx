'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { StockCycleReport } from '@fishmaster/shared-types';
import { memberCategoryLabel } from '@fishmaster/shared-types';
import { ContentTabs } from './ContentTabs';
import { API_URL, isVideoMedia, mediaSrc } from '../lib/api';

export type DisplayProfile = {
  farmerName: string;
  gender: string | null;
  phone: string | null;
  email: string | null;
  categories: string[];
  estimatedFishOutputYear: string | null;
  farmName: string;
  location: string;
  city: string;
  state: string;
  country: string;
  pond: {
    name: string;
    number: number;
    lengthM: number;
    widthM: number;
    depthM: number;
    volumeLiters: number;
  };
  stock: {
    averageWeightAtStockingG: number;
    fingerlingPrice: number;
    quantityStocked: number;
    stockingDate: string | Date;
    firstFeedingDate: string | Date;
    stockingMonth: string;
    desiredCrudeProteinPct: number;
    desiredFeedQuantityKg: number;
    fishSpecies: string | null;
  };
};

type Tab = 'today' | 'grid' | 'numbers';

function fmtDate(d: string | Date) {
  const x = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(x.getTime())) return '—';
  return x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'FM';
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function AppDisplayPage({
  report,
  display,
  pondName,
  ponds = [],
  cycleId,
  onSwitchPond,
  statusNote,
  todayActivities = [],
  todayExpectedFeedKg = null,
  todayActualFeedKg = null,
  dayInCulture = null,
  onLog,
}: {
  report: StockCycleReport;
  display: DisplayProfile | null;
  pondName?: string;
  ponds?: { id: string; label: string }[];
  cycleId?: string | null;
  onSwitchPond?: (id: string) => void;
  statusNote?: string | null;
  todayActivities?: string[];
  todayExpectedFeedKg?: number | null;
  todayActualFeedKg?: number | null;
  dayInCulture?: number | null;
  onLog?: () => void;
}) {
  const [tab, setTab] = useState<Tab>('today');
  const [sponsor, setSponsor] = useState<{ id: string; title: string; body: string; mediaUrl: string | null } | null>(null);
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const [feedMonth, setFeedMonth] = useState(0);
  const [openSection, setOpenSection] = useState<string | null>('profile');

  const m = report.monthlyProjections;
  const mort = report.mortalitySummaries;
  const chart = report.dailyFeedCharts[feedMonth] ?? [];
  const lastMonth = m[m.length - 1];
  const nowMonth = m[feedMonth];

  useEffect(() => {
    fetch(`${API_URL}/api/content/ads?place=home`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setSponsor(list.length ? list[new Date().getDate() % list.length] : null);
      })
      .catch(() => setSponsor(null));
  }, []);

  const todayRow = useMemo(() => {
    const today = new Date();
    return report.dailyFeedCharts.flat().find((r) => sameDay(new Date(r.date), today)) ?? null;
  }, [report.dailyFeedCharts]);

  const month1 = report.dailyFeedCharts[0] ?? [];
  const month1Start = month1[0]?.dayInCycle ?? 1;
  const dayOfMonth = (day: number) => month1.find((r) => r.dayInCycle - month1Start + 1 === day);
  const midMonth1 = dayOfMonth(15) ?? month1[14];
  const endMonth1 = dayOfMonth(30) ?? month1[month1.length - 1];

  const locationLine = display
    ? [display.location, display.city, display.state, display.country].filter(Boolean).join(', ')
    : pondName || 'Your pond';

  const species = display?.stock.fishSpecies ?? 'Fish';
  const name = display?.farmName || pondName || 'Your farm';
  const farmer = display?.farmerName || 'Farmer';
  const pondLabel = display?.pond.name ?? pondName ?? 'Pond';
  const quantityLeft = display
    ? Math.max(
        0,
        display.stock.quantityStocked - (mort[mort.length - 1]?.cumulativeMortality ?? 0),
      )
    : (mort[mort.length - 1]?.closingStock ?? null);

  const maxWeight = Math.max(...m.map((x) => x.expectedAvgWeightG), 1);
  const maxFeed = Math.max(...m.map((x) => x.monthlyFeedKg), 1);

  const expectedKg =
    todayExpectedFeedKg ??
    (todayRow ? (todayRow.morningFeedG + todayRow.eveningFeedG) / 1000 : null);
  const actualKg = todayActualFeedKg;
  const expectedG = expectedKg != null ? expectedKg * 1000 : todayRow ? todayRow.morningFeedG + todayRow.eveningFeedG : null;
  const actualG = actualKg != null ? actualKg * 1000 : null;
  const feedCompareMax = Math.max(expectedG ?? 0, actualG ?? 0, 1);
  const dayLabel = dayInCulture ?? todayRow?.dayInCycle ?? null;

  const jumpMonth = (i: number) => {
    setFeedMonth(i);
    setTab('today');
  };

  return (
    <div className="phone-frame" style={shell}>
      <header className="ig-profile" style={profile}>
        <div className="ig-profile-head" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={avatar}>{initials(farmer)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>{name}</div>
            <div style={{ color: '#737373', fontSize: '0.82rem', marginTop: 2 }}>
              {pondLabel}
              {dayLabel != null ? ` · Day ${dayLabel} in cycle` : ''}
            </div>
          </div>
        </div>

        <div className="ig-profile-stats" style={statRow}>
          <Stat n={quantityLeft != null ? quantityLeft.toLocaleString() : '—'} label="fish quantity left" />
          <Stat n={display ? display.stock.quantityStocked.toLocaleString() : '—'} label="fish stocked" />
          <Stat n={lastMonth ? `${lastMonth.expectedAvgWeightG.toFixed(0)} g` : '—'} label="month 6 weight" />
        </div>

        <div className="ig-profile-bio">
          <p style={{ margin: '10px 0 0', fontSize: '0.86rem', lineHeight: 1.45 }}>
            <strong>{species}</strong>
            {farmer !== 'Farmer' ? <span style={{ color: '#737373' }}> · {farmer}</span> : null}
          </p>
          {locationLine ? (
            <p style={{ margin: '4px 0 0', fontSize: '0.86rem', lineHeight: 1.45, color: '#737373' }}>
              {locationLine}
            </p>
          ) : null}
          {statusNote ? (
            <p style={{ margin: '8px 0 0', fontSize: '0.84rem', color: '#0d4f6e', fontWeight: 600 }}>{statusNote}</p>
          ) : null}
        </div>

        {ponds.length > 1 && cycleId && onSwitchPond && (
          <label className="ig-profile-pond ig-desktop-hide" style={{ display: 'block', marginTop: 12 }}>
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>Switch pond</span>
            <select
              value={cycleId}
              onChange={(e) => onSwitchPond(e.target.value)}
              style={pondSelect}
            >
              {ponds.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
        )}
      </header>

      {/* Today-first hero: ration + activities + Daily log */}
      <section style={{ padding: '0 16px 12px' }}>
        <div className="ig-hero" style={{ ...hero, borderRadius: 16 }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.85 }}>
            Today’s feed
          </div>
          <div className="ig-hero-value" style={{ fontSize: '2.1rem', fontWeight: 700, letterSpacing: '-0.04em', marginTop: 8 }}>
            {expectedKg != null ? `${expectedKg.toFixed(2)} kg` : '—'}
          </div>
          <div style={{ opacity: 0.9, marginTop: 4 }}>
            Chart amount
            {todayRow
              ? ` · morning ${todayRow.morningFeedG.toFixed(0)} g · evening ${todayRow.eveningFeedG.toFixed(0)} g`
              : ''}
          </div>
          {(expectedG != null || actualG != null) && (
            <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
              <FeedBar label="Chart" grams={expectedG} max={feedCompareMax} tone="#bae6fd" />
              <FeedBar label="Logged" grams={actualG} max={feedCompareMax} tone="#fbbf24" empty="Not logged yet" />
            </div>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            <Mini label="Feed size" value={nowMonth?.feedSizeMm ?? '—'} />
            <Mini label="Fish left" value={quantityLeft != null ? quantityLeft.toLocaleString() : '—'} />
            <Mini
              label="Logged"
              value={actualKg != null ? `${actualKg.toFixed(2)} kg` : '—'}
            />
          </div>
        </div>

        <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0d4f6e' }}>
            Today’s activities
          </div>
          {todayActivities.length > 0 ? (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: '0.88rem', lineHeight: 1.5, color: '#334155' }}>
              {todayActivities.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: '8px 0 0', fontSize: '0.86rem', color: '#64748b' }}>
              Nothing logged for today yet.
            </p>
          )}
        </div>

        {onLog && (
          <button
            type="button"
            onClick={onLog}
            className="ig-desktop-hide"
            style={{
              display: 'block',
              width: '100%',
              marginTop: 12,
              padding: '14px 16px',
              borderRadius: 12,
              border: 'none',
              background: '#0d4f6e',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Daily log
          </button>
        )}
      </section>

      <div style={stories} className="swipe-rail">
        {onLog && (
          <button type="button" className="ig-desktop-hide" onClick={onLog} style={storyBtn}>
            <span style={{ ...storyRing, boxShadow: '0 0 0 2px #fff, 0 0 0 3px #f59e0b' }}>
              <span style={{ ...storyInner, background: '#fff7ed', color: '#c2410c' }}>+</span>
            </span>
            <span style={storyLabel}>Daily log</span>
          </button>
        )}
        {m.map((x, i) => (
          <button key={x.month} type="button" onClick={() => jumpMonth(i)} style={storyBtn} aria-label={`Month ${x.month}, feed size ${x.feedSizeMm}`}>
            <span style={{ ...storyRing, boxShadow: feedMonth === i && tab === 'today' ? '0 0 0 2px #fff, 0 0 0 4px #0d4f6e' : '0 0 0 2px #fff, 0 0 0 3px #dbdbdb' }}>
              <span style={storyInner}>{x.month}</span>
            </span>
            <span style={storyLabel}>Month {x.month}</span>
          </button>
        ))}
      </div>
      <p className="swipe-hint">Swipe for months · open Numbers for full reports</p>

      <div style={tabs} role="tablist">
        <TabButton active={tab === 'today'} label="Today" onClick={() => setTab('today')} />
        <TabButton active={tab === 'grid'} label="Months" onClick={() => setTab('grid')} />
        <TabButton active={tab === 'numbers'} label="Numbers" onClick={() => setTab('numbers')} />
      </div>

      {tab === 'today' && (
        <div>
          <section style={{ padding: '4px 0 8px' }}>
            <div style={postMeta}>
              <strong>Daily ration</strong>
              <span style={{ color: '#737373' }}> · month {feedMonth + 1}</span>
              <span className="swipe-hint-inline"> · swipe</span>
            </div>
            <div className="ig-day-rail swipe-rail" style={dayRail}>
              {chart.map((r) => {
                const isToday = sameDay(new Date(r.date), new Date());
                return (
                  <article key={r.dayInCycle} className="ig-day-card" style={{ ...dayCard, outline: isToday ? '2px solid #0d4f6e' : '1px solid #efefef' }}>
                    <div style={{ fontSize: '0.72rem', color: '#737373' }}>{fmtDate(r.date)}</div>
                    <div style={{ fontWeight: 700, marginTop: 6 }}>Day {r.dayInCycle}</div>
                    <div style={{ marginTop: 10, fontSize: '1.15rem', fontWeight: 700, color: '#0d4f6e' }}>{r.morningFeedG.toFixed(0)}g</div>
                    <div style={{ fontSize: '0.72rem', color: '#737373' }}>morning</div>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>{r.eveningFeedG.toFixed(0)}g</div>
                    <div style={{ fontSize: '0.72rem', color: '#737373' }}>evening</div>
                  </article>
                );
              })}
            </div>
          </section>

          <div style={{ padding: '4px 16px 24px' }}>
            <ContentTabs />
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingTop: 16 }}>
              <Link href="/reports" style={chip}>Reports</Link>
              <Link href="/marketplace" style={chip}>Market</Link>
              <button type="button" onClick={() => setTab('numbers')} style={{ ...chip, border: 'none', cursor: 'pointer', font: 'inherit' }}>
                Numbers
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'grid' && (
        <div>
          <p className="swipe-hint" style={{ padding: '0 16px' }}>Swipe months</p>
          <div style={grid} className="swipe-rail">
          {m.map((x, i) => {
            const left = mort[i]?.closingStock;
            const wash = i % 2 === 0 ? 'linear-gradient(165deg, #0d4f6e, #155e75)' : 'linear-gradient(165deg, #115e75, #0f766e)';
            return (
              <button key={x.month} type="button" onClick={() => jumpMonth(i)} style={{ ...gridCell, background: wash }}>
                <span style={{ fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85 }}>Month {x.month}</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{x.expectedAvgWeightG.toFixed(0)} g</span>
                <span style={{ fontSize: '0.68rem', opacity: 0.9 }}>{left ?? '—'} fish left</span>
              </button>
            );
          })}
          </div>

          <Post
            kicker="Growth"
            title={`${lastMonth ? lastMonth.expectedAvgWeightG.toFixed(0) : '—'} g by month 6`}
            caption={`Started at ${display?.stock.averageWeightAtStockingG ?? '—'} g. Bars are expected average weight.`}
          >
            <div className="ig-bars" style={bars}>
              {m.map((x) => (
                <div key={x.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: '0.68rem', color: '#525252' }}>{x.expectedAvgWeightG.toFixed(0)}</div>
                  <div style={{ height: 120, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{
                      width: '100%',
                      height: `${Math.max(8, (x.expectedAvgWeightG / maxWeight) * 100)}%`,
                      borderRadius: '8px 8px 3px 3px',
                      background: x.month === nowMonth?.month ? '#0d4f6e' : '#b6d4e3',
                    }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#737373' }}>Month {x.month}</div>
                </div>
              ))}
            </div>
          </Post>

          <Post
            kicker="Stocking"
            title={`${display?.stock.quantityStocked.toLocaleString() ?? '—'} fish in the water`}
            caption={`Pond ${display?.pond.lengthM ?? '—'} × ${display?.pond.widthM ?? '—'} × ${display?.pond.depthM ?? '—'} m. Advice for this volume:`}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <Tile label="Extensive" value={report.advisedStocking.extensive.toFixed(0)} />
              <Tile label="Semi-intensive" value={report.advisedStocking.semiIntensive.toFixed(0)} />
              <Tile label="Intensive" value={report.advisedStocking.intensive.toFixed(0)} />
            </div>
          </Post>

          {display && midMonth1 && endMonth1 && (
            <Post
              kicker="Month 1"
              title={`${display.stock.quantityStocked.toLocaleString()} juveniles`}
              caption={`Stocked ${fmtDate(display.stock.stockingDate)} · ${display.stock.stockingMonth} · ${display.stock.averageWeightAtStockingG} g · ${display.pond.volumeLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })} litres`}
            >
              <div style={{ display: 'grid', gap: 8 }}>
                <Snap label="Mid-month weight should be" value={`${midMonth1.averageWeightG.toFixed(1)} g`} />
                <Snap label="End-month weight should be" value={`${endMonth1.averageWeightG.toFixed(1)} g`} />
                <Snap label="Stock mid-month" value={midMonth1.presentQuantity.toLocaleString()} />
                <Snap label="Stock end of month" value={endMonth1.presentQuantity.toLocaleString()} />
                <Snap label="Deaths by end of month" value={String(mort[0]?.cumulativeMortality ?? '—')} />
              </div>
            </Post>
          )}

          <Post
            kicker="Cycle feed"
            title={`${report.cycleFeedKg.months6.toFixed(0)} kg over 6 months`}
            caption={`${report.cycleFeedBags.months6.toFixed(1)} bags of 15 kg. Month 4 is ${report.cycleFeedKg.months4.toFixed(0)} kg · month 5 is ${report.cycleFeedKg.months5.toFixed(0)} kg.`}
          >
            <div className="ig-bars swipe-rail" style={bars}>
              {m.map((x) => (
                <div key={x.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 36 }}>
                  <div style={{ height: 90, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{
                      width: '100%',
                      height: `${Math.max(8, (x.monthlyFeedKg / maxFeed) * 100)}%`,
                      borderRadius: '8px 8px 3px 3px',
                      background: '#f59e0b',
                    }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#737373' }}>Month {x.month}</div>
                </div>
              ))}
            </div>
            <p className="swipe-hint">Swipe for months</p>
          </Post>

          {sponsor && (
            <div style={sponsorCard}>
              <button type="button" onClick={() => setSponsorOpen((v) => !v)} style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'inherit' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0d4f6e' }}>Sponsored</span>
                <span style={{ display: 'block', fontWeight: 700, marginTop: 4 }}>{sponsor.title}</span>
                {!sponsor.mediaUrl && (
                  <span style={{ display: 'block', marginTop: 4, color: '#525252', fontSize: '0.86rem' }}>{sponsor.body.replace(/\s+/g, ' ').slice(0, 110)}</span>
                )}
              </button>
              {sponsor.mediaUrl && isVideoMedia(sponsor.mediaUrl) && (
                <video src={mediaSrc(sponsor.mediaUrl)} controls playsInline style={{ width: '100%', maxHeight: 240, marginTop: 8, background: '#000', borderRadius: 10 }} />
              )}
              {sponsor.mediaUrl && !isVideoMedia(sponsor.mediaUrl) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaSrc(sponsor.mediaUrl)} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 10, marginTop: 8 }} />
              )}
              {sponsorOpen && sponsor.body.trim() && sponsor.body.trim() !== sponsor.title.trim() && (
                <p style={{ margin: '8px 0 0', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{sponsor.body}</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'numbers' && (
        <div style={{ padding: '4px 16px 24px' }}>
          <Accordion id="profile" title="Profile" open={openSection} setOpen={setOpenSection}>
            {display ? (
              <Rows rows={[
                ['Farmer', display.farmerName],
                ['Gender', display.gender ?? '—'],
                ['Phone', display.phone ?? '—'],
                ['Email', display.email ?? '—'],
                ['Categories', display.categories.length ? display.categories.map(memberCategoryLabel).join(' · ') : '—'],
                ['Farm address', display.location || '—'],
                ['City', display.city || '—'],
                ['State', display.state || '—'],
                ['Country', display.country || '—'],
              ]} />
            ) : <p style={muted}>Sample data — register to see your profile.</p>}
          </Accordion>
          <Accordion id="stock" title="Stock & pond" open={openSection} setOpen={setOpenSection}>
            {display ? (
              <Rows rows={[
                ['Pond', `${display.pond.name} (#${display.pond.number})`],
                ['Pond size', `${display.pond.lengthM} × ${display.pond.widthM} × ${display.pond.depthM} m`],
                ['Pond volume', `${display.pond.volumeLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })} litres`],
                ['Species', display.stock.fishSpecies ?? '—'],
                ['Fish quantity stocked', display.stock.quantityStocked],
                ['Fish quantity left', quantityLeft ?? '—'],
                ['Weight at stocking', `${display.stock.averageWeightAtStockingG} g`],
                ['Fingerling price', display.stock.fingerlingPrice],
                ['Output (tonnes) / year', display.estimatedFishOutputYear ?? '—'],
                ['Stocking date', fmtDate(display.stock.stockingDate)],
                ['First feed', fmtDate(display.stock.firstFeedingDate)],
                ['Protein', `${display.stock.desiredCrudeProteinPct}%`],
                ['Desired feed', `${display.stock.desiredFeedQuantityKg} kg`],
              ]} />
            ) : <p style={muted}>No stock profile on this sample.</p>}
          </Accordion>
          <Accordion id="advice" title="Stocking advice & feed size" open={openSection} setOpen={setOpenSection}>
            <Rows rows={[
              ['Extensive', report.advisedStocking.extensive.toFixed(0)],
              ['Semi-intensive', report.advisedStocking.semiIntensive.toFixed(0)],
              ['Intensive', report.advisedStocking.intensive.toFixed(0)],
              ...m.map((x) => [`Month ${x.month} feed size`, x.feedSizeMm] as [string, string | number]),
            ]} />
          </Accordion>
          <Accordion id="growth" title="Weight & feed by month" open={openSection} setOpen={setOpenSection}>
            <Rows rows={m.flatMap((x, i) => {
              const cumFish = m.slice(0, i + 1).reduce((sum, row) => sum + row.expectedTotalWeightKg, 0);
              return [
                [`Month ${x.month} average weight`, `${x.expectedAvgWeightG.toFixed(1)} g`],
                [`Month ${x.month} total weight`, `${x.expectedTotalWeightKg.toFixed(1)} kg`],
                [`Month ${x.month} feed`, `${x.monthlyFeedKg.toFixed(1)} kg · ${x.monthlyFeedBags.toFixed(1)} bags`],
                [`Month ${x.month} cumulative`, `${x.cumulativeFeedKg.toFixed(1)} kg feed · ${cumFish.toFixed(1)} kg fish`],
              ] as [string, string][];
            })} />
          </Accordion>
          <Accordion id="cycle" title="Cycle totals" open={openSection} setOpen={setOpenSection}>
            <Rows rows={[
              ['4 months feed', `${report.cycleFeedKg.months4.toFixed(1)} kg · ${report.cycleFeedBags.months4.toFixed(1)} bags`],
              ['5 months feed', `${report.cycleFeedKg.months5.toFixed(1)} kg · ${report.cycleFeedBags.months5.toFixed(1)} bags`],
              ['6 months feed', `${report.cycleFeedKg.months6.toFixed(1)} kg · ${report.cycleFeedBags.months6.toFixed(1)} bags`],
            ]} />
          </Accordion>
          <Accordion id="mort" title="Mortality & stock left" open={openSection} setOpen={setOpenSection}>
            <Rows rows={mort.flatMap((x) => [
              [`Month ${x.month} opening → close`, `${x.openingStock} → ${x.closingStock}`],
              [`Month ${x.month} mortality`, `${x.monthlyMortality} (${x.mortalityPct.toFixed(1)}%) · cumulative ${x.cumulativeMortality}`],
            ])} />
          </Accordion>
        </div>
      )}
    </div>
  );
}

function Snap({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.88rem' }}>
      <span style={{ color: '#525252' }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{n}</div>
      <div style={{ fontSize: '0.72rem', color: '#737373' }}>{label}</div>
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} style={{
      flex: 1,
      border: 'none',
      background: 'transparent',
      padding: '12px 0',
      fontSize: '0.82rem',
      fontWeight: active ? 700 : 500,
      color: active ? '#262626' : '#a3a3a3',
      borderBottom: active ? '1px solid #262626' : '1px solid transparent',
      cursor: 'pointer',
    }}>
      {label}
    </button>
  );
}

function Post({ kicker, title, caption, children }: { kicker: string; title: string; caption: string; children: React.ReactNode }) {
  return (
    <article style={{ borderBottom: '1px solid #efefef', paddingBottom: 14, marginBottom: 4 }}>
      <div style={postMeta}>
        <strong>{kicker}</strong>
      </div>
      {children}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{ fontWeight: 650, fontSize: '0.95rem' }}>{title}</div>
        <p style={{ margin: '4px 0 0', color: '#525252', fontSize: '0.84rem', lineHeight: 1.4 }}>{caption}</p>
      </div>
    </article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>{label}</div>
    </div>
  );
}

function FeedBar({
  label,
  grams,
  max,
  tone,
  empty,
}: {
  label: string;
  grams: number | null;
  max: number;
  tone: string;
  empty?: string;
}) {
  const has = grams != null && grams >= 0;
  const pct = has ? Math.max(4, Math.min(100, (grams / max) * 100)) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
        <span style={{ opacity: 0.9 }}>{label}</span>
        <span style={{ fontWeight: 600 }}>
          {has ? `${(grams / 1000).toFixed(2)} kg` : (empty ?? '—')}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: tone, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#fafafa', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0d4f6e' }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: '#737373', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Accordion({
  id, title, open, setOpen, children,
}: {
  id: string;
  title: string;
  open: string | null;
  setOpen: (id: string | null) => void;
  children: React.ReactNode;
}) {
  const on = open === id;
  return (
    <section style={{ borderBottom: '1px solid #efefef' }}>
      <button type="button" onClick={() => setOpen(on ? null : id)} style={accBtn}>
        <span>{title}</span>
        <span style={{ color: '#a3a3a3' }}>{on ? '–' : '+'}</span>
      </button>
      {on && <div style={{ paddingBottom: 12 }}>{children}</div>}
    </section>
  );
}

function Rows({ rows }: { rows: [string, string | number][] }) {
  return (
    <div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', fontSize: '0.86rem' }}>
          <span style={{ color: '#737373' }}>{k}</span>
          <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

const shell: React.CSSProperties = {
  background: '#fff',
  color: '#262626',
};

const profile: React.CSSProperties = { padding: '8px 16px 12px' };

const avatar: React.CSSProperties = {
  width: 78,
  height: 78,
  borderRadius: '50%',
  background: 'linear-gradient(145deg, #0d4f6e, #38bdf8)',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 700,
  fontSize: '1.35rem',
  flexShrink: 0,
};

const statRow: React.CSSProperties = { display: 'flex', marginTop: 16, gap: 8 };

const stories: React.CSSProperties = {
  display: 'flex',
  gap: 14,
  overflowX: 'auto',
  padding: '8px 16px 14px',
  borderBottom: '1px solid #efefef',
  WebkitOverflowScrolling: 'touch',
};

const storyBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  flex: '0 0 auto',
};

const storyRing: React.CSSProperties = { borderRadius: '50%', padding: 2 };

const storyInner: React.CSSProperties = {
  width: 62,
  height: 62,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  background: '#f5f5f5',
  fontWeight: 700,
  fontSize: '0.85rem',
  color: '#0d4f6e',
};

const storyLabel: React.CSSProperties = { fontSize: '0.68rem', color: '#737373', maxWidth: 72, textAlign: 'center' };

const tabs: React.CSSProperties = { display: 'flex', borderBottom: '1px solid #efefef' };

const hero: React.CSSProperties = {
  margin: '0 0 0',
  minHeight: 220,
  padding: '28px 20px',
  color: '#fff',
  background: 'linear-gradient(160deg, #0d4f6e 0%, #155e75 48%, #f59e0b 140%)',
};

const postMeta: React.CSSProperties = { padding: '12px 16px 8px', fontSize: '0.88rem' };

const bars: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 8,
  padding: '8px 16px 4px',
};

const dayRail: React.CSSProperties = {
  // layout handled by .ig-day-rail in device.css
};

const dayCard: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  padding: '12px 12px 14px',
};

const grid: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  overflowX: 'auto',
  padding: '8px 16px 20px',
  WebkitOverflowScrolling: 'touch',
};

const gridCell: React.CSSProperties = {
  flex: '0 0 140px',
  border: 'none',
  borderRadius: 14,
  padding: '14px 12px',
  color: '#fff',
  textAlign: 'left',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  gap: 3,
  minHeight: 110,
};

const pondSelect: React.CSSProperties = {
  width: '100%',
  marginTop: 4,
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid #e5e5e5',
  background: '#fafafa',
  fontSize: '0.85rem',
};

const accBtn: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 0',
  border: 'none',
  background: 'transparent',
  fontSize: '0.92rem',
  fontWeight: 650,
  cursor: 'pointer',
  color: '#262626',
};

const sponsorCard: React.CSSProperties = {
  width: 'calc(100% - 32px)',
  margin: '8px 16px 16px',
  padding: '12px 14px',
  textAlign: 'left',
  borderRadius: 14,
  border: '1px solid #e8f4f8',
  background: '#f8fafc',
  color: 'inherit',
};

const chip: React.CSSProperties = {
  flex: '0 0 auto',
  textDecoration: 'none',
  color: '#262626',
  background: '#f5f5f5',
  borderRadius: 999,
  padding: '8px 12px',
  fontSize: '0.78rem',
  fontWeight: 600,
};

const muted: React.CSSProperties = { color: '#737373', fontSize: '0.85rem' };
