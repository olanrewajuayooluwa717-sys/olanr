'use client';

import type { StockCycleReport } from '@fishmaster/shared-types';
import { Card } from './Shell';

const anchor = { scrollMarginTop: 80 } as const;

export function ReportsDashboard({ report }: { report: StockCycleReport }) {
  const m = report.monthlyProjections;
  const mort = report.mortalitySummaries;

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <div id="report-1" style={anchor}>
        <Card title="1. Advised feed size per month">
          <MonthTable rows={m.map((x) => [`Month ${x.month}`, x.feedSizeMm])} />
        </Card>
      </div>

      <div id="report-2" style={anchor}>
        <Card title="2. Advised stocking capacity">
          Extensive: {report.advisedStocking.extensive.toFixed(0)} · Semi: {report.advisedStocking.semiIntensive.toFixed(0)} · Intensive: {report.advisedStocking.intensive.toFixed(0)} fish
          <br />Volume: {report.advisedStocking.pondVolumeLiters.toFixed(0)} L
        </Card>
      </div>

      <div id="report-3" style={anchor}>
        <Card title="3. Cumulative feed bags (15 kg)">
          <MonthTable rows={m.map((x) => [`Month ${x.month}`, x.cumulativeFeedBags.toFixed(1)])} />
        </Card>
      </div>

      <div id="report-4" style={anchor}>
        <Card title="4. Cumulative feed (kg) & total fish weight (kg)">
          <MonthTable rows={m.map((x) => [`Month ${x.month}`, `${x.cumulativeFeedKg.toFixed(0)} kg feed`, `${x.expectedTotalWeightKg.toFixed(0)} kg fish`])} />
        </Card>
      </div>

      <div id="report-5" style={anchor}>
        <Card title="5. Cumulative mortality">
          <MonthTable rows={mort.map((x) => [`Month ${x.month}`, x.cumulativeMortality])} />
        </Card>
      </div>

      <div id="report-6" style={anchor}>
        <Card title="6. Estimated feed quantity (kg) for cycle">
          4 months: {report.cycleFeedKg.months4.toFixed(0)} kg<br />
          5 months: {report.cycleFeedKg.months5.toFixed(0)} kg<br />
          6 months: {report.cycleFeedKg.months6.toFixed(0)} kg
        </Card>
      </div>

      <div id="report-7" style={anchor}>
        <Card title="7. Estimated feed bags for cycle">
          4 months: {report.cycleFeedBags.months4.toFixed(1)} bags<br />
          5 months: {report.cycleFeedBags.months5.toFixed(1)} bags<br />
          6 months: {report.cycleFeedBags.months6.toFixed(1)} bags
        </Card>
      </div>

      <div id="report-8" style={anchor}>
        <Card title="8. Expected 15 kg bags per month">
          <MonthTable rows={m.map((x) => [`Month ${x.month}`, x.monthlyFeedBags.toFixed(1)])} />
        </Card>
      </div>

      <div id="report-9" style={anchor}>
        <Card title="9. Expected monthly average weight (g)">
          <MonthTable rows={m.map((x) => [`Month ${x.month}`, x.expectedAvgWeightG.toFixed(1)])} />
        </Card>
      </div>

      <div id="report-10" style={anchor}>
        <Card title="10. Expected monthly feed (kg)">
          <MonthTable rows={m.map((x) => [`Month ${x.month}`, x.monthlyFeedKg.toFixed(1)])} />
        </Card>
      </div>

      <div id="report-11" style={anchor}>
        <Card title="11. Expected monthly total fish weight (kg)">
          <MonthTable rows={m.map((x) => [`Month ${x.month}`, x.expectedTotalWeightKg.toFixed(1)])} />
        </Card>
      </div>

      <div id="report-12" style={anchor}>
        <Card title="12. Daily feed chart (month 1)">
          <FeedChartTable chart={report.dailyFeedCharts[0]?.slice(0, 10) ?? []} />
        </Card>
      </div>

      <div id="report-13" style={anchor}>
        <Card title="13. Fish quantity at close of day (month 1)">
          <FeedChartTable chart={report.dailyFeedCharts[0]?.slice(0, 10) ?? []} showQty />
        </Card>
      </div>

      <div id="report-14" style={anchor}>
        <Card title="14. Monthly feed & closing stock">
          <MonthTable rows={m.map((x, i) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, mort[i]?.closingStock ?? '—'])} />
        </Card>
      </div>

      <div id="report-15" style={anchor}>
        <Card title="15. Monthly feed & average weight">
          <MonthTable rows={m.map((x) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, `${x.expectedAvgWeightG.toFixed(0)} g`])} />
        </Card>
      </div>

      <div id="report-16" style={anchor}>
        <Card title="16. Monthly feed & mortality">
          <MonthTable rows={m.map((x, i) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, mort[i]?.monthlyMortality ?? 0])} />
        </Card>
      </div>

      <div id="report-17" style={anchor}>
        <Card title="17. Monthly feed & total weight">
          <MonthTable rows={m.map((x) => [`Month ${x.month}`, `${x.monthlyFeedKg.toFixed(0)} kg`, `${x.expectedTotalWeightKg.toFixed(0)} kg`])} />
        </Card>
      </div>

      <div id="report-18" style={anchor}>
        <Card title="18. Monthly mortality & fish quantity">
          <MonthTable rows={mort.map((x) => [`Month ${x.month}`, `Lost: ${x.monthlyMortality}`, `Left: ${x.closingStock}`])} />
        </Card>
      </div>

      <div id="report-19" style={anchor}>
        <Card title="19. Monthly mortality records">
          <MonthTable rows={mort.map((x) => [`Month ${x.month}`, x.monthlyMortality])} />
        </Card>
      </div>

      <div id="report-20" style={anchor}>
        <Card title="20. Monthly opening & closing stock">
          <MonthTable rows={mort.map((x) => [`Month ${x.month}`, `Open: ${x.openingStock}`, `Close: ${x.closingStock}`])} />
        </Card>
      </div>

      <div id="report-21" style={anchor}>
        <Card title="21. Monthly quantity & % mortality">
          <MonthTable rows={mort.map((x) => [`Month ${x.month}`, `${x.mortalityPct.toFixed(2)}%`])} />
        </Card>
      </div>
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
