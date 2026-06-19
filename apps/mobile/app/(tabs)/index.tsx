import { useCallback, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { StockCycleReport } from '@fishmaster/shared-types';
import { API_URL, fetchCycleReport, getCycleId, authHeaders } from '../../src/api';
import { colors } from '../../src/theme';

type NewsPost = { id: string; type: string; title: string; body: string };

export default function DashboardScreen() {
  const [report, setReport] = useState<StockCycleReport | null>(null);
  const [pondName, setPondName] = useState('');
  const [news, setNews] = useState<NewsPost[]>([]);
  const [sub, setSub] = useState<{ tier: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const cycleId = await getCycleId();
      const data = await fetchCycleReport(cycleId);
      setReport(data.report);
      setPondName(data.pondName);
      setError(null);
      const [content, status] = await Promise.all([
        fetch(`${API_URL}/api/content`).then((r) => r.json()),
        fetch(`${API_URL}/api/billing/status`, { headers: await authHeaders() }).then((r) => r.json()).catch(() => null),
      ]);
      setNews(content);
      if (status) setSub({ tier: status.tier, status: status.status });
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const m0 = report?.monthlyProjections[0];
  const todayChart = report?.dailyFeedCharts[0]?.[0];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      <Text style={styles.pond}>{pondName || 'Loading…'}</Text>
      {sub && <Text style={styles.sub}>{sub.tier} plan · {sub.status}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

      {report && (
        <View style={styles.grid}>
          <Stat label="Pond volume" value={`${report.advisedStocking.pondVolumeLiters.toFixed(0)} L`} />
          <Stat label="Month 1 feed" value={`${m0?.monthlyFeedKg.toFixed(0)} kg`} />
          <Stat label="Avg FCR" value={report.averageFcr.toFixed(2)} />
          <Stat label="6-mo feed" value={`${report.cycleFeedKg.months6.toFixed(0)} kg`} />
        </View>
      )}

      {todayChart && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's expected feed (day 1)</Text>
          <Text style={styles.feedLine}>Total: {todayChart.feedKg.toFixed(2)} kg</Text>
          <Text style={styles.feedSub}>
            Morning 90%: {(todayChart.feedKg * 0.9).toFixed(2)} kg · Evening 10%: {(todayChart.feedKg * 0.1).toFixed(2)} kg
          </Text>
          <Text style={styles.feedSub}>Fish on hand: {todayChart.presentQuantity} · Avg {todayChart.averageWeightG.toFixed(1)} g</Text>
          <Text style={styles.hint}>Log actual feed in the Daily log tab to check under/overfeeding.</Text>
        </View>
      )}

      {news.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>News & Education</Text>
          {news.slice(0, 3).map((n) => (
            <View key={n.id} style={styles.newsItem}>
              <Text style={styles.newsTitle}>[{n.type}] {n.title}</Text>
              <Text style={styles.newsBody} numberOfLines={2}>{n.body}</Text>
            </View>
          ))}
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
  sub: { color: colors.muted, marginBottom: 12 },
  error: { color: colors.danger, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 12 },
  stat: { backgroundColor: colors.card, borderRadius: 10, padding: 14, width: '47%', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statLabel: { fontSize: 12, color: colors.muted },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.primary, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginTop: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.primary, marginBottom: 8 },
  feedLine: { fontSize: 20, fontWeight: '700', color: colors.primary },
  feedSub: { color: colors.text, marginTop: 4, fontSize: 14 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  newsItem: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 8 },
  newsTitle: { fontWeight: '600', color: colors.primary },
  newsBody: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
