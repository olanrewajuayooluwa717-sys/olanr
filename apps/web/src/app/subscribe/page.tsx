'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, btnStyle } from '../../components/Shell';
import { apiFetch, getToken } from '../../lib/api';

type Plan = { id: string; label: string; priceGbp: number; features: string[] };

export default function SubscribePage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/billing/plans`)
      .then((r) => r.json())
      .then(setPlans);
  }, [router]);

  const subscribe = async (tier: string) => {
    setLoading(tier);
    setError(null);
    try {
      const { url } = await apiFetch('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier }),
      });
      window.location.href = url;
    } catch (e) {
      setError(String(e).replace('Error: ', ''));
      setLoading(null);
    }
  };

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ color: '#0d4f6e' }}>Choose your plan</h1>
      <p style={{ color: '#555' }}>Monthly subscription · pay in your local currency via Stripe · payouts in GBP</p>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
        {plans.map((plan) => (
          <Card key={plan.id} title={`${plan.label} — £${plan.priceGbp.toFixed(2)}/mo`}>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#444', minHeight: 100 }}>
              {plan.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <button
              style={{ ...btnStyle, width: '100%', marginTop: '0.75rem', opacity: loading ? 0.6 : 1 }}
              disabled={!!loading}
              onClick={() => subscribe(plan.id)}
            >
              {loading === plan.id ? 'Redirecting…' : 'Subscribe'}
            </button>
          </Card>
        ))}
      </div>
    </main>
  );
}
