import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import type { StockCycleReport } from '@fishmaster/shared-types';
import { colors } from './theme';

export function ReportsDashboard({
  report,
  onSectionLayout,
}: {
  report: StockCycleReport;
  onSectionLayout?: (reportId: number, y: number) => void;
}) {
  const m = report.monthlyProjections;
  const mort = report.mortalitySummaries;
  const chart = report.dailyFeedCharts[0] ?? [];

  const layout = (id: number) => (e: LayoutChangeEvent) => {
    onSectionLayout?.(id, e.nativeEvent.layout.y);
  };

  return (
    <View style={styles.wrap}>
      <Section id={1} onLayout={layout(1)} title="1. Advised feed size per month">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, x.feedSizeMm])} />
      </Section>

      <Section id={2} onLayout={layout(2)} title="2. Advised stocking capacity">
        <Line text={`Extensive: ${report.advisedStocking.extensive.toFixed(0)} fish`} />
        <Line text={`Semi-intensive: ${report.advisedStocking.semiIntensive.toFixed(0)} fish`} />
        <Line text={`Intensive: ${report.advisedStocking.intensive.toFixed(0)} fish`} />
        <Line text={`Volume: ${report.advisedStocking.pondVolumeLiters.toFixed(0)} L`} />
      </Section>

      <Section id={3} onLayout={layout(3)} title="3. Cumulative feed bags (15 kg)">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.cumulativeFeedBags.toFixed(1)} bags`])} />
      </Section>

      <Section id={4} onLayout={layout(4)} title="4. Cumulative feed (kg) & total fish weight (kg)">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.cumulativeFeedKg.toFixed(0)} kg`, `${x.expectedTotalWeightKg.toFixed(0)} kg fish`])} />
      </Section>

      <Section id={5} onLayout={layout(5)} title="5. Cumulative mortality">
        <MonthRows rows={mort.map((x) => [`Month ${x.month}`, String(x.cumulativeMortality)])} />
      </Section>

      <Section id={6} onLayout={layout(6)} title="6. Estimated feed quantity (kg) for cycle">
        <Line text={`4 months: ${report.cycleFeedKg.months4.toFixed(0)} kg`} />
        <Line text={`5 months: ${report.cycleFeedKg.months5.toFixed(0)} kg`} />
        <Line text={`6 months: ${report.cycleFeedKg.months6.toFixed(0)} kg`} />
      </Section>

      <Section id={7} onLayout={layout(7)} title="7. Estimated feed bags for cycle">
        <Line text={`4 months: ${report.cycleFeedBags.months4.toFixed(1)} bags`} />
        <Line text={`5 months: ${report.cycleFeedBags.months5.toFixed(1)} bags`} />
        <Line text={`6 months: ${report.cycleFeedBags.months6.toFixed(1)} bags`} />
      </Section>

      <Section id={8} onLayout={layout(8)} title="8. Expected 15 kg bags per month">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.monthlyFeedBags.toFixed(1)} bags`])} />
      </Section>

      <Section id={9} onLayout={layout(9)} title="9. Expected monthly average weight (g)">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.expectedAvgWeightG.toFixed(1)} g`])} />
      </Section>

      <Section id={10} onLayout={layout(10)} title="10. Expected monthly feed (kg)">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(1)} kg`])} />
      </Section>

      <Section id={11} onLayout={layout(11)} title="11. Expected monthly total fish weight (kg)">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.expectedTotalWeightKg.toFixed(1)} kg`])} />
      </Section>

      <Section id={12} onLayout={layout(12)} title="12. Daily feed chart (month 1, first 10 days)">
        <FeedChart rows={chart.slice(0, 10)} />
      </Section>

      <Section id={13} onLayout={layout(13)} title="13. Fish quantity at close of day (month 1)">
        <FeedChart rows={chart.slice(0, 10)} showQty />
      </Section>

      <Section id={14} onLayout={layout(14)} title="14. Monthly feed & closing stock">
        <MonthRows rows={m.map((x, i) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, String(mort[i]?.closingStock ?? '—')])} />
      </Section>

      <Section id={15} onLayout={layout(15)} title="15. Monthly feed & average weight">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, `${x.expectedAvgWeightG.toFixed(0)} g`])} />
      </Section>

      <Section id={16} onLayout={layout(16)} title="16. Monthly feed & mortality">
        <MonthRows rows={m.map((x, i) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, String(mort[i]?.monthlyMortality ?? 0)])} />
      </Section>

      <Section id={17} onLayout={layout(17)} title="17. Monthly feed & total weight">
        <MonthRows rows={m.map((x) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, `${x.expectedTotalWeightKg.toFixed(0)} kg`])} />
      </Section>

      <Section id={18} onLayout={layout(18)} title="18. Monthly mortality & fish quantity">
        <MonthRows rows={mort.map((x) => [`Month ${x.month}`, `Lost: ${x.monthlyMortality}`, `Left: ${x.closingStock}`])} />
      </Section>

      <Section id={19} onLayout={layout(19)} title="19. Monthly mortality records">
        <MonthRows rows={mort.map((x) => [`Month ${x.month}`, String(x.monthlyMortality)])} />
      </Section>

      <Section id={20} onLayout={layout(20)} title="20. Monthly opening & closing stock">
        <MonthRows rows={mort.map((x) => [`Month ${x.month}`, `Open: ${x.openingStock}`, `Close: ${x.closingStock}`])} />
      </Section>

      <Section id={21} onLayout={layout(21)} title="21. Monthly quantity & % mortality">
        <MonthRows rows={mort.map((x) => [`Month ${x.month}`, `${x.mortalityPct.toFixed(2)}%`])} />
      </Section>
    </View>
  );
}

function Section({
  id, title, children, onLayout,
}: {
  id: number; title: string; children: React.ReactNode; onLayout?: (e: LayoutChangeEvent) => void;
}) {
  return (
    <View style={styles.section} onLayout={onLayout} nativeID={`report-${id}`}>
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
