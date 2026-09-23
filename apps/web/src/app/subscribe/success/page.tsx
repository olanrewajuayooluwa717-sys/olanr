'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, btnStyle, Flash } from '../../../components/Shell';
import { apiFetch, getToken } from '../../../lib/api';

export default function SubscribeSuccessPage() {
  const [status, setStatus] = useState<'activating' | 'active' | 'error'>('activating');
  const [detail, setDetail] = useState('Confirming your payment…');

  useEffect(() => {
    if (!getToken()) {
      setStatus('error');
      setDetail('Sign in again, then open Plans if your membership is not active yet.');
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) {
      // Older Checkout redirects without session_id — status may still update via webhook.
      setStatus('active');
      setDetail('Payment received. If Plans still looks inactive, wait a minute and refresh.');
      return;
    }

    apiFetch('/api/billing/confirm', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    })
      .then((data: { status?: string; tier?: string }) => {
        setStatus('active');
        setDetail(
          data.tier
            ? `Your ${data.tier} plan is active.`
            : 'Your payment was successful and your account is now active.',
        );
      })
      .catch((e) => {
        setStatus('error');
        setDetail(String(e).replace(/^Error:\s*/, ''));
      });
  }, []);

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <Card title={status === 'error' ? 'Payment received' : 'Subscription active'}>
        {status === 'activating' && <p>{detail}</p>}
        {status === 'active' && <p>{detail}</p>}
        {status === 'error' && (
          <>
            <Flash tone="warn">{detail}</Flash>
            <p style={{ marginTop: '0.75rem', color: '#555' }}>
              Stripe took the payment. If membership is not active in a minute, tell us — the webhook may need its signing secret refreshed on Render.
            </p>
          </>
        )}
        <Link href="/" style={{ ...btnStyle, display: 'inline-block', textDecoration: 'none', marginTop: '1rem' }}>
          Go to dashboard
        </Link>
      </Card>
    </main>
  );
}
