'use client';

import Link from 'next/link';
import { Card } from '../../components/Shell';

export default function ForgotPasswordPage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: 440,
        margin: '0 auto',
        padding: 'max(1.25rem, env(safe-area-inset-top)) 1rem max(1.5rem, env(safe-area-inset-bottom))',
        background: '#f0f7fa',
      }}
    >
      <h1 style={{ color: '#0d4f6e', margin: '0 0 0.35rem' }}>Forgot password</h1>
      <p style={{ color: '#64748b', margin: '0 0 1.25rem', fontSize: '0.95rem' }}>
        Password reset is handled by your Fishmaster administrator.
      </p>
      <Card title="How to reset">
        <p style={{ margin: '0 0 0.75rem', color: '#475569', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Contact admin to reset your password. Email your registered account address to your farm support
          contact or Fishmaster admin, and they will issue a new temporary password.
        </p>
        <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.85rem' }}>
          Self-serve email reset is planned — this page beats the empty legacy link by telling you exactly what to do.
        </p>
        <Link
          href="/login"
          style={{
            display: 'inline-block',
            background: '#0d4f6e',
            color: '#fff',
            textDecoration: 'none',
            padding: '0.55rem 1rem',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          Back to sign in
        </Link>
      </Card>
    </main>
  );
}
