'use client';

import type { StockCycleReport } from '@fishmaster/shared-types';
import { Card } from './Shell';

export function ReportsDashboard({ report }: { report: StockCycleReport }) {
  const m = report.monthlyProjections;
  const mort = report.mortalitySummaries;

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <Card title="1. Advised feed size per month">
        <MonthTable rows={m.map((x) => [`Month ${x.month}`, x.feedSizeMm])} />
      </Card>

      <Card title="2. Advised stocking capacity">
        Extensive: {report.advisedStocking.extensive.toFixed(0)} · Semi: {report.advisedStocking.semiIntensive.toFixed(0)} · Intensive: {report.advisedStocking.intensive.toFixed(0)} fish
        <br />Volume: {report.advisedStocking.pondVolumeLiters.toFixed(0)} L
      </Card>

      <Card title="3. Cumulative feed bags (15 kg)">
        <MonthTable rows={m.map((x) => [`Month ${x.month}`, x.cumulativeFeedBags.toFixed(1)])} />
      </Card>

      <Card title="4. Cumulative feed (kg) & total fish weight (kg)">
        <MonthTable rows={m.map((x) => [`Month ${x.month}`, `${x.cumulativeFeedKg.toFixed(0)} kg feed`, `${x.expectedTotalWeightKg.toFixed(0)} kg fish`])} />
      </Card>

      <Card title="5. Cumulative mortality">
        <MonthTable rows={mort.map((x) => [`Month ${x.month}`, x.cumulativeMortality])} />
      </Card>

      <Card title="6–7. Estimated feed per cycle">
        4 months: {report.cycleFeedKg.months4.toFixed(0)} kg ({report.cycleFeedBags.months4.toFixed(1)} bags)<br />
        5 months: {report.cycleFeedKg.months5.toFixed(0)} kg ({report.cycleFeedBags.months5.toFixed(1)} bags)<br />
        6 months: {report.cycleFeedKg.months6.toFixed(0)} kg ({report.cycleFeedBags.months6.toFixed(1)} bags)
      </Card>

      <Card title="8. Expected 15 kg bags per month">
        <MonthTable rows={m.map((x) => [`Month ${x.month}`, x.monthlyFeedBags.toFixed(1)])} />
      </Card>

      <Card title="9. Expected monthly average weight (g)">
        <MonthTable rows={m.map((x) => [`Month ${x.month}`, x.expectedAvgWeightG.toFixed(1)])} />
      </Card>

      <Card title="10. Expected monthly feed (kg)">
        <MonthTable rows={m.map((x) => [`Month ${x.month}`, x.monthlyFeedKg.toFixed(1)])} />
      </Card>

      <Card title="11. Expected monthly total fish weight (kg)">
        <MonthTable rows={m.map((x) => [`Month ${x.month}`, x.expectedTotalWeightKg.toFixed(1)])} />
      </Card>

      <Card title="12. Daily feed chart (month 1)">
        <FeedChartTable chart={report.dailyFeedCharts[0]?.slice(0, 10) ?? []} />
      </Card>

      <Card title="13. Fish quantity at close of day (month 1)">
        <FeedChartTable chart={report.dailyFeedCharts[0]?.slice(0, 10) ?? []} showQty />
      </Card>

      <Card title="14. Monthly feed & closing stock">
        <MonthTable rows={m.map((x, i) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, mort[i]?.closingStock ?? '—'])} />
      </Card>

      <Card title="15. Monthly feed & average weight">
        <MonthTable rows={m.map((x) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, `${x.expectedAvgWeightG.toFixed(0)} g`])} />
      </Card>

      <Card title="16. Monthly feed & mortality">
        <MonthTable rows={m.map((x, i) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, mort[i]?.monthlyMortality ?? 0])} />
      </Card>

      <Card title="17. Monthly feed & total weight">
        <MonthTable rows={m.map((x) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, `${x.expectedTotalWeightKg.toFixed(0)} kg`])} />
      </Card>

      <Card title="18. Monthly mortality & fish quantity">
        <MonthTable rows={mort.map((x) => [`Month ${x.month}`, `Lost: ${x.monthlyMortality}`, `Left: ${x.closingStock}`])} />
      </Card>

      <Card title="19. Monthly mortality records">
        <MonthTable rows={mort.map((x) => [`Month ${x.month}`, x.monthlyMortality])} />
      </Card>

      <Card title="20. Monthly opening & closing stock">
        <MonthTable rows={mort.map((x) => [`Month ${x.month}`, `Open: ${x.openingStock}`, `Close: ${x.closingStock}`])} />
      </Card>

      <Card title="21. Monthly quantity & % mortality">
        <MonthTable rows={mort.map((x) => [`Month ${x.month}`, `${x.mortalityPct.toFixed(2)}%`])} />
      </Card>
    </section>
  );
}

function MonthTable({ rows }: { rows: (string | number)[][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderTop: '1px solid #eee' }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: '0.35rem 0.5rem' }} align={j === 0 ? 'left' : 'right'}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FeedChartTable({ chart, showQty }: { chart: StockCycleReport['dailyFeedCharts'][0]; showQty?: boolean }) {
  if (!chart?.length) return <p>No data</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
      <thead>
        <tr>
          <th align="left">Day</th>
          <th align="right">{showQty ? 'Qty' : 'Feed kg'}</th>
          {!showQty && <th align="right">Avg g</th>}
        </tr>
      </thead>
      <tbody>
        {chart.map((row) => (
          <tr key={row.dayInCycle}>
            <td>{row.dayInCycle}</td>
            <td align="right">{showQty ? row.presentQuantity : row.feedKg.toFixed(2)}</td>
            {!showQty && <td align="right">{row.averageWeightG.toFixed(1)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
