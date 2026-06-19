'use client';

import { useEffect, useState } from 'react';
import type { StockCycleReport } from '@fishmaster/shared-types';
import { ReportsDashboard } from '../../components/ReportsDashboard';
import { fetchCycleReport, fetchReportFallback } from '../../lib/api';

export default function ReportsPage() {
  const [report, setReport] = useState<StockCycleReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('fishmaster_cycle_id');
    fetchCycleReport(saved)
      .then(({ report: r }) => { setReport(r); setError(null); })
      .catch(() => fetchReportFallback().then(({ report: r }) => { setReport(r); setError('Offline sample data'); }))
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ color: '#0d4f6e' }}>All 21 Reports</h1>
      {error && <p style={{ color: '#b45309' }}>{error}</p>}
      {report && <ReportsDashboard report={report} />}
    </main>
  );
}
