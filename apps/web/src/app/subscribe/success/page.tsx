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
      setDetail('Sign in again, then open Plans and tap “Refresh membership”.');
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    const activate = async () => {
      if (sessionId) {
        try {
          const data = await apiFetch('/api/billing/confirm', {
            method: 'POST',
            body: JSON.stringify({ sessionId }),
          });
          setStatus('active');
          setDetail(
            data.tier
              ? `Your ${data.tier} plan is active.`
              : 'Your payment was successful and your account is now active.',
          );
          return;
        } catch {
          /* fall through to Stripe sync */
        }
      }

      const synced = await apiFetch('/api/billing/sync', { method: 'POST' });
      if (synced.status === 'active' || synced.synced) {
        setStatus('active');
        setDetail(
          synced.tier
            ? `Your ${synced.tier} plan is active.`
            : 'Your payment was successful and your account is now active.',
        );
        return;
      }
      setStatus('error');
      setDetail(
        'Payment received in Stripe, but membership is not active yet. Open Plans and tap Refresh membership.',
      );
    };

    activate().catch((e) => {
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
              Stripe webhooks can show 400 if Render’s signing secret is wrong. Refresh membership on Plans still activates you from Stripe.
            </p>
          </>
        )}
        <Link href="/subscribe" style={{ ...btnStyle, display: 'inline-block', textDecoration: 'none', marginTop: '1rem' }}>
          Back to Plans
        </Link>
        <div style={{ marginTop: '0.75rem' }}>
          <Link href="/" style={{ color: '#0d4f6e' }}>
            Go to dashboard
          </Link>
        </div>
      </Card>
    </main>
  );
}
