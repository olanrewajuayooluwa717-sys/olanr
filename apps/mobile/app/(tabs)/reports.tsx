import { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import type { StockCycleReport } from '@fishmaster/shared-types';
import { REPORT_CATALOG } from '@fishmaster/shared-types';
import { fetchCycleReport, getCycleId } from '../../src/api';
import { ReportsDashboard } from '../../src/ReportsDashboard';
import { colors } from '../../src/theme';

export default function ReportsScreen() {
  const { report: reportParam } = useLocalSearchParams<{ report?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [offsets, setOffsets] = useState<Record<number, number>>({});
  const [report, setReport] = useState<StockCycleReport | null>(null);
  const focusId = reportParam ? Number(reportParam) : undefined;

  useFocusEffect(useCallback(() => {
    getCycleId().then((id) => fetchCycleReport(id).then((d) => setReport(d.report)));
  }, []));

  useFocusEffect(useCallback(() => {
    if (focusId && offsets[focusId] != null) {
      const y = offsets[focusId] + 100;
      setTimeout(() => scrollRef.current?.scrollTo({ y, animated: true }), 400);
    }
  }, [focusId, offsets]));

  const meta = focusId ? REPORT_CATALOG.find((r) => r.id === focusId) : null;

  if (!report) return <Text style={styles.loading}>Loading reports…</Text>;

  return (
    <ScrollView ref={scrollRef} style={styles.container}>
      <Text style={styles.heading}>All 21 reports</Text>
      <Text style={styles.sub}>Included free with your monthly subscription — no per-report payment.</Text>
      {meta && (
        <View style={styles.highlight}>
          <Text style={styles.highlightTitle}>Report {meta.id}</Text>
          <Text style={styles.highlightBody}>{meta.title}</Text>
        </View>
      )}
      <ReportsDashboard
        report={report}
        onSectionLayout={(id, y) => setOffsets((o) => ({ ...o, [id]: y }))}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  loading: { padding: 24, color: colors.muted },
  heading: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  sub: { fontSize: 13, color: colors.muted, marginBottom: 12 },
  highlight: { backgroundColor: '#e0f2fe', borderRadius: 10, padding: 12, marginBottom: 12 },
  highlightTitle: { fontWeight: '700', color: colors.primary },
  highlightBody: { color: colors.text, marginTop: 4, fontSize: 13 },
});
