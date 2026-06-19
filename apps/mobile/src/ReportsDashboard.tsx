import { View, Text, StyleSheet } from 'react-native';
import type { StockCycleReport } from '@fishmaster/shared-types';
import { colors } from './theme';

export function ReportsDashboard({ report }: { report: StockCycleReport }) {
  const m = report.monthlyProjections;
  const mort = report.mortalitySummaries;
  const chart = report.dailyFeedCharts[0] ?? [];

  return (
    <View style={styles.wrap}>
      <Section title="1. Advised feed size per month">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, x.feedSizeMm])} />
      </Section>

      <Section title="2. Advised stocking capacity">
        <Line text={`Extensive: ${report.advisedStocking.extensive.toFixed(0)} fish`} />
        <Line text={`Semi-intensive: ${report.advisedStocking.semiIntensive.toFixed(0)} fish`} />
        <Line text={`Intensive: ${report.advisedStocking.intensive.toFixed(0)} fish`} />
        <Line text={`Volume: ${report.advisedStocking.pondVolumeLiters.toFixed(0)} L`} />
      </Section>

      <Section title="3. Cumulative feed bags (15 kg)">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.cumulativeFeedBags.toFixed(1)} bags`])} />
      </Section>

      <Section title="4. Cumulative feed (kg) & total fish weight (kg)">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.cumulativeFeedKg.toFixed(0)} kg`, `${x.expectedTotalWeightKg.toFixed(0)} kg fish`])} />
      </Section>

      <Section title="5. Cumulative mortality">
        <MonthRows rows={mort.map((x) => [`Month ${x.month}`, String(x.cumulativeMortality)])} />
      </Section>

      <Section title="6–7. Estimated feed per cycle">
        <Line text={`4 months: ${report.cycleFeedKg.months4.toFixed(0)} kg (${report.cycleFeedBags.months4.toFixed(1)} bags)`} />
        <Line text={`5 months: ${report.cycleFeedKg.months5.toFixed(0)} kg (${report.cycleFeedBags.months5.toFixed(1)} bags)`} />
        <Line text={`6 months: ${report.cycleFeedKg.months6.toFixed(0)} kg (${report.cycleFeedBags.months6.toFixed(1)} bags)`} />
      </Section>

      <Section title="8. Expected 15 kg bags per month">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.monthlyFeedBags.toFixed(1)} bags`])} />
      </Section>

      <Section title="9. Expected monthly average weight (g)">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.expectedAvgWeightG.toFixed(1)} g`])} />
      </Section>

      <Section title="10. Expected monthly feed (kg)">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(1)} kg`])} />
      </Section>

      <Section title="11. Expected monthly total fish weight (kg)">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.expectedTotalWeightKg.toFixed(1)} kg`])} />
      </Section>

      <Section title="12. Daily feed chart (month 1, first 10 days)">
        <FeedChart rows={chart.slice(0, 10)} />
      </Section>

      <Section title="13. Fish quantity at close of day (month 1)">
        <FeedChart rows={chart.slice(0, 10)} showQty />
      </Section>

      <Section title="14. Monthly feed & closing stock">
        <MonthRows rows={m.map((x, i) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, String(mort[i]?.closingStock ?? '—')])} />
      </Section>

      <Section title="15. Monthly feed & average weight">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, `${x.expectedAvgWeightG.toFixed(0)} g`])} />
      </Section>

      <Section title="16. Monthly feed & mortality">
        <MonthRows rows={m.map((x, i) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, String(mort[i]?.monthlyMortality ?? 0)])} />
      </Section>

      <Section title="17. Monthly feed & total weight">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, `${x.expectedTotalWeightKg.toFixed(0)} kg`])} />
      </Section>

      <Section title="18. Monthly mortality & fish quantity">
        <MonthRows rows={mort.map((x) => [`Month ${x.month}`, `Lost: ${x.monthlyMortality}`, `Left: ${x.closingStock}`])} />
      </Section>

      <Section title="19. Monthly mortality records">
        <MonthRows rows={mort.map((x) => [`Month ${x.month}`, String(x.monthlyMortality)])} />
      </Section>

      <Section title="20. Monthly opening & closing stock">
        <MonthRows rows={mort.map((x) => [`Month ${x.month}`, `Open: ${x.openingStock}`, `Close: ${x.closingStock}`])} />
      </Section>

      <Section title="21. Monthly quantity & % mortality">
        <MonthRows rows={mort.map((x) => [`Month ${x.month}`, `${x.mortalityPct.toFixed(2)}%`])} />
      </Section>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Line({ text }: { text: string }) {
  return <Text style={styles.line}>{text}</Text>;
}

function MonthRows({ rows }: { rows: (string | number)[][] }) {
  return (
    <>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((cell, j) => (
            <Text key={j} style={[styles.line, j > 0 && styles.cellRight]}>{cell}</Text>
          ))}
        </View>
      ))}
    </>
  );
}

function FeedChart({ rows, showQty }: { rows: StockCycleReport['dailyFeedCharts'][0]; showQty?: boolean }) {
  if (!rows.length) return <Line text="No data" />;
  return (
    <>
      {rows.map((row) => (
        <View key={row.dayInCycle} style={styles.row}>
          <Text style={styles.line}>Day {row.dayInCycle}</Text>
          <Text style={[styles.line, styles.cellRight]}>
            {showQty ? row.presentQuantity : `${row.feedKg.toFixed(2)} kg`}
          </Text>
          {!showQty && <Text style={[styles.line, styles.cellRight]}>{row.averageWeightG.toFixed(1)} g</Text>}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  section: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 12 },
  sectionTitle: { fontWeight: '600', color: colors.primary, marginBottom: 8 },
  line: { fontSize: 14, color: colors.text, paddingVertical: 3, flex: 1 },
  row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 4, marginTop: 4 },
  cellRight: { textAlign: 'right' },
});
