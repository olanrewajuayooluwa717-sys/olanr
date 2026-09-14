import { useCallback, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  fetchEconomics, fetchSales, getCycleId, getRole, type EconomicsSummary, type FishSale,
} from '../src/api';
import { colors } from '../src/theme';

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return `₦${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function EconomicsScreen() {
  const [summary, setSummary] = useState<EconomicsSummary | null>(null);
  const [sales, setSales] = useState<FishSale[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(false);

  const load = useCallback(async () => {
    try {
      const role = await getRole();
      if (role !== 'super_admin' && role !== 'manager') {
        setAllowed(false);
        setError('Full economics is available to staff accounts only.');
        return;
      }
      setAllowed(true);
      const id = await getCycleId();
      if (!id) {
        setError('No pond selected — log in first');
        return;
      }
      const [econ, saleList] = await Promise.all([
        fetchEconomics(id),
        fetchSales(id),
      ]);
      setSummary(econ);
      setSales(saleList);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!allowed) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, justifyContent: 'center' }}>
        <Text style={{ color: colors.muted }}>{error ?? 'Checking access…'}</Text>
      </View>
    );
  }
  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      {error && <Text style={styles.error}>{error}</Text>}

      {summary && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Combined summary</Text>
          <Text style={styles.sub}>{summary.pondName}</Text>
          <Row label="Feed cost" value={fmt(summary.cumulativeFeedCost)} />
          <Row label="Power estimate" value={fmt(summary.powerCostEstimate)} />
          <Row label="Misc costs" value={fmt(summary.miscCostsTotal)} />
          <Row label="Total costs" value={fmt(summary.totalCosts)} bold />
          <Row label="Sales revenue" value={fmt(summary.salesRevenue)} positive />
          <Row
            label="Profit / loss"
            value={fmt(summary.profitLoss)}
            bold
            color={summary.profitLoss >= 0 ? colors.success : colors.danger}
          />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sales history</Text>
        {sales.length === 0 ? (
          <Text style={styles.sub}>No sales logged yet.</Text>
        ) : (
          sales.map((s) => (
            <View key={s.id} style={styles.saleRow}>
              <Text style={styles.saleDate}>{s.date.slice(0, 10)}</Text>
              <Text style={styles.saleDetail}>
                {s.quantitySold} fish · {s.avgWeightG ? `${s.avgWeightG.toFixed(0)} g avg` : '—'}
              </Text>
              <Text style={styles.saleRevenue}>{fmt(s.totalRevenue)}</Text>
              {s.customerName && <Text style={styles.sub}>Customer: {s.customerName}</Text>}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Row({
  label, value, bold, positive, color,
}: {
  label: string; value: string; bold?: boolean; positive?: boolean; color?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[
        styles.rowValue,
        bold && styles.bold,
        positive && { color: colors.success },
        color ? { color } : null,
      ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  error: { color: colors.danger, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.primary, marginBottom: 4 },
  sub: { color: colors.muted, fontSize: 13, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#eee' },
  rowLabel: { fontSize: 14, color: colors.text },
  rowValue: { fontSize: 14, color: colors.primary },
  bold: { fontWeight: '700' },
  saleRow: { borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 8 },
  saleDate: { fontWeight: '600', color: colors.primary },
  saleDetail: { fontSize: 13, color: colors.text, marginTop: 2 },
  saleRevenue: { fontSize: 14, fontWeight: '600', color: colors.success, marginTop: 2 },
});
