'use client';

import Link from 'next/link';
import { CONTENT_CATEGORIES, REPORT_CATALOG } from '@fishmaster/shared-types';

export function HomeIconGrid() {
  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ color: '#0d4f6e', fontSize: '1rem', marginBottom: '0.75rem' }}>Content</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '0.75rem' }}>
        {CONTENT_CATEGORIES.map((c) => (
          <Link key={c.type} href={`/content/${c.type}`} style={iconLink}>
            <span style={{ fontSize: '1.75rem' }}>{c.icon}</span>
            <span style={iconLabel}>{c.label}</span>
          </Link>
        ))}
      </div>

      <h2 style={{ color: '#0d4f6e', fontSize: '1rem', margin: '1.25rem 0 0.75rem' }}>Reports (included with subscription)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '0.5rem' }}>
        {REPORT_CATALOG.map((r) => (
          <Link key={r.id} href={`/reports#report-${r.id}`} style={iconLinkSmall} title={r.title}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0d4f6e' }}>{r.id}</span>
            <span style={{ ...iconLabel, fontSize: '0.65rem' }}>{r.short}</span>
          </Link>
        ))}
      </div>
      <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
        All 21 reports are free for active subscribers — no per-report payment.
      </p>
    </section>
  );
}

const iconLink: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.75rem 0.5rem',
  background: '#fff',
  borderRadius: 10,
  textDecoration: 'none',
  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
};

const iconLinkSmall: React.CSSProperties = {
  ...iconLink,
  padding: '0.5rem 0.25rem',
};

const iconLabel: React.CSSProperties = {
  fontSize: '0.72rem',
  color: '#334155',
  textAlign: 'center',
  lineHeight: 1.2,
};
