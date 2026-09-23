import { useCallback, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import type { StockCycleReport } from '@fishmaster/shared-types';
import { TIER_LABELS } from '@fishmaster/shared-types';
import {
  API_URL, clearAuth, fetchCycleReport, fetchDashboard, fetchEconomics, getCycleId, getRole, setCycleId, authHeaders, fetchUserCycles, isVideoMedia, mediaSrc,
  type EconomicsSummary,
} from '../../src/api';
import { HomeIconGrid } from '../../src/HomeIconGrid';
import { PondSwitcher } from '../../src/PondSwitcher';
import { colors } from '../../src/theme';

type NewsPost = { id: string; type: string; title: string; body: string; mediaUrl?: string | null; placements?: string[] };
type Dash = Awaited<ReturnType<typeof fetchDashboard>>;

export default function DashboardScreen() {
  const [report, setReport] = useState<StockCycleReport | null>(null);
  const [dash, setDash] = useState<Dash | null>(null);
  const [pondName, setPondName] = useState('');
  const [cycleId, setCycleIdState] = useState<string | null>(null);
  const [ponds, setPonds] = useState<{ id: string; label: string }[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [sub, setSub] = useState<{ tierLabel: string; status: string } | null>(null);
  const [econ, setEcon] = useState<EconomicsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canSeeFullEconomics, setCanSeeFullEconomics] = useState(false);

  const load = useCallback(async (overrideCycleId?: string | null) => {
    try {
      const role = await getRole();
      const staff = role === 'super_admin' || role === 'manager';
      setCanSeeFullEconomics(staff);
      const id = overrideCycleId ?? (await getCycleId());
      setCycleIdState(id);
      const [data, dashboard, economics] = await Promise.all([
        fetchCycleReport(id),
        fetchDashboard(id).catch(() => null),
        staff ? fetchEconomics(id).catch(() => null) : Promise.resolve(null),
      ]);
      setReport(data.report);
      setPondName(data.pondName);
      setCycleIdState(data.cycleId);
      if (dashboard) setDash(dashboard);
      setEcon(economics);
      setError(null);
      const [content, status, cycles] = await Promise.all([
        fetch(`${API_URL}/api/content`, { headers: await authHeaders() })
          .then(async (r) => {
            const data = await r.json().catch(() => null);
            if (r.status === 401) {
              await clearAuth();
              setError('Session expired — sign in again to open articles.');
              return [];
            }
            if (!r.ok || !Array.isArray(data)) return [];
            return data as NewsPost[];
          })
          .catch(() => [] as NewsPost[]),
        fetch(`${API_URL}/api/billing/status`, { headers: await authHeaders() }).then((r) => r.json()).catch(() => null),
        fetchUserCycles(),
      ]);
      setNews(Array.isArray(content) ? content : []);
      setPonds(cycles.map((c) => ({
        id: c.id,
        label: `${c.pond.farm.name} · ${c.pond.name} (#${c.pond.number})`,
      })));
      if (status) {
        const label = status.plan?.label ?? TIER_LABELS[status.tier] ?? status.tier;
        setSub({ tierLabel: label, status: status.status });
      }
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const switchPond = async (id: string) => {
    await setCycleId(id);
    load(id);
  };

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const m0 = report?.monthlyProjections[0];
  const now = new Date().toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <Text style={styles.pond}>{pondName || 'Loading…'}</Text>
      <Text style={styles.clock}>{dash?.monthName ?? ''} · {now}</Text>
      {sub && <Text style={styles.sub}>{sub.tierLabel} · {sub.status}</Text>}
      <PondSwitcher ponds={ponds} selectedId={cycleId} onSelect={switchPond} />
      {error && <Text style={styles.error}>{error}</Text>}

      {dash && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today&apos;s pond</Text>
          <Text style={styles.feedSub}>Day {dash.dayInCulture} in culture cycle</Text>
          {dash.todayExpectedFeedKg != null && (
            <>
              <Text style={styles.feedLine}>
                Feed today: {dash.todayExpectedFeedKg.toFixed(2)} kg expected
                {dash.todayActualFeedKg != null ? ` · ${dash.todayActualFeedKg.toFixed(2)} kg logged` : ''}
              </Text>
              <Text style={styles.feedSub}>
                Morning: {dash.todayMorningFeedKg?.toFixed(2)} kg · Evening: {dash.todayEveningFeedKg?.toFixed(2)} kg
              </Text>
            </>
          )}
          {dash.yesterdayExpectedFeedKg != null && (
            <Text style={styles.feedSub}>Yesterday expected: {dash.yesterdayExpectedFeedKg.toFixed(2)} kg</Text>
          )}
          <View style={styles.grid}>
            {dash.fishOnHand != null && <Stat label="Fish on hand" value={String(dash.fishOnHand)} />}
            {dash.expectedAvgWeightG != null && (
              <Stat label="Expected avg wt" value={`${dash.expectedAvgWeightG.toFixed(1)} g`} />
            )}
            {dash.actualAvgWeightG != null && (
              <Stat label="Actual avg wt" value={`${dash.actualAvgWeightG.toFixed(1)} g`} />
            )}
            {dash.month1FeedCost != null && (
              <Stat label="Month 1 feed cost" value={`₦${dash.month1FeedCost.toFixed(0)}`} />
            )}
            {dash.cumulativeFeedCost != null && (
              <Stat label="Feed cost to date" value={`₦${dash.cumulativeFeedCost.toFixed(0)}`} />
            )}
            {canSeeFullEconomics && dash.averageFcr != null && (
              <Stat label="FCR" value={dash.averageFcr.toFixed(2)} />
            )}
          </View>
          {dash.pondCleaning && (
            <Text style={[styles.feedSub, dash.pondCleaning.dueToday && { color: colors.danger, fontWeight: '600' }]}>
              {dash.pondCleaning.dueToday
                ? `Pond cleaning due today (day ${dash.dayInCulture})`
                : `Next pond cleaning: day ${dash.pondCleaning.nextCleaningDayInCulture} (${dash.pondCleaning.daysUntilNextCleaning} days)`}
            </Text>
          )}
        </View>
      )}

      {canSeeFullEconomics && econ && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Economics snapshot</Text>
          <Text style={styles.feedSub}>
            Costs: ₦{econ.totalCosts.toLocaleString()} · Sales: ₦{econ.salesRevenue.toLocaleString()}
          </Text>
          <Text style={[styles.feedSub, { color: econ.profitLoss >= 0 ? colors.success : colors.danger, fontWeight: '600' }]}>
            P/L: ₦{econ.profitLoss.toLocaleString()}
          </Text>
          <Pressable onPress={() => router.push('/economics')} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>View full economics →</Text>
          </Pressable>
        </View>
      )}

      {news.filter((n) => n.type === 'advert' && (!n.placements?.length || n.placements.includes('home'))).slice(0, 1).map((n) => (
        <View key={n.id} style={styles.card}>
          <Text style={styles.feedSub}>Sponsored</Text>
          <Text style={styles.newsTitle}>{n.title}</Text>
          {n.mediaUrl && !isVideoMedia(n.mediaUrl) && (
            <Image source={{ uri: mediaSrc(n.mediaUrl) }} style={{ width: '100%', height: 160, borderRadius: 8, marginTop: 8 }} resizeMode="cover" />
          )}
          {n.mediaUrl && isVideoMedia(n.mediaUrl) && (
            <Text style={styles.newsBody}>Video ad</Text>
          )}
          <Text style={styles.newsBody} numberOfLines={3}>{n.body}</Text>
        </View>
      ))}

      <HomeIconGrid />

      {report && (
        <View style={styles.grid}>
          <Stat label="Pond volume" value={`${report.advisedStocking.pondVolumeLiters.toFixed(0)} L`} />
          <Stat label="Month 1 feed" value={`${m0?.monthlyFeedKg.toFixed(0)} kg`} />
          {canSeeFullEconomics && <Stat label="Avg FCR" value={report.averageFcr.toFixed(2)} />}
          <Stat label="6-mo feed" value={`${report.cycleFeedKg.months6.toFixed(0)} kg`} />
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  pond: { fontSize: 20, fontWeight: '700', color: colors.primary },
  clock: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  sub: { color: colors.muted, marginBottom: 12 },
  error: { color: colors.danger, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 12 },
  stat: { backgroundColor: colors.card, borderRadius: 10, padding: 14, width: '47%', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statLabel: { fontSize: 12, color: colors.muted },
  statValue: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginTop: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.primary, marginBottom: 8 },
  feedLine: { fontSize: 20, fontWeight: '700', color: colors.primary },
  feedSub: { color: colors.text, marginTop: 4, fontSize: 14 },
  newsItem: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 8 },
  newsTitle: { fontWeight: '600', color: colors.primary },
  newsBody: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
