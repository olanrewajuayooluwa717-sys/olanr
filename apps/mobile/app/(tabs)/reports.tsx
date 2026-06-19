import { useCallback, useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { StockCycleReport } from '@fishmaster/shared-types';
import { fetchCycleReport, getCycleId } from '../../src/api';
import { ReportsDashboard } from '../../src/ReportsDashboard';
import { colors } from '../../src/theme';

export default function ReportsScreen() {
  const [report, setReport] = useState<StockCycleReport | null>(null);

  useFocusEffect(useCallback(() => {
    getCycleId().then((id) => fetchCycleReport(id).then((d) => setReport(d.report)));
  }, []));

  if (!report) return <Text style={styles.loading}>Loading reports…</Text>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>All 21 reports</Text>
      <ReportsDashboard report={report} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  loading: { padding: 24, color: colors.muted },
  heading: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 8 },
});
