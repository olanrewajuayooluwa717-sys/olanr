'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, btnStyle, Flash } from '../../components/Shell';
import { apiFetch, getToken } from '../../lib/api';

type Plan = { id: string; label: string; priceGbp: number; features: string[] };

type PlansResponse = {
  plans?: Plan[];
  presentment?: string;
  stripeConfigured?: boolean;
};

export default function SubscribePage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [presentment, setPresentment] = useState<string>('');
  const [stripeReady, setStripeReady] = useState(true);
  const [cancelled, setCancelled] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('cancelled')) {
      setCancelled(true);
    }
    apiFetch('/api/billing/plans')
      .then((data: PlansResponse | Plan[]) => {
        if (Array.isArray(data)) {
          setPlans(data);
          return;
        }
        setPlans(Array.isArray(data.plans) ? data.plans : []);
        if (data.presentment) setPresentment(data.presentment);
        if (typeof data.stripeConfigured === 'boolean') setStripeReady(data.stripeConfigured);
      })
      .catch(() => setError('Could not load plans — the API may be waking up. Wait ~30s and refresh.'));
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
    <main className="phone-frame" style={{ background: '#fff', minHeight: '70vh', padding: '1.25rem 1.25rem 2.5rem' }}>
      <h1 style={{ color: '#0d4f6e', margin: '0 0 0.35rem' }}>Choose your plan</h1>
      <p style={{ color: '#555', margin: '0 0 1rem', lineHeight: 1.45 }}>
        Monthly subscription. Reference price is in GBP; at checkout Stripe shows an equivalent in your local currency when available (for example naira in Nigeria).
      </p>
      {cancelled && (
        <Flash tone="warn">Checkout cancelled — no charge was made.</Flash>
      )}
      {!stripeReady && (
        <Flash tone="warn">Card payments are being connected. You can still browse plans; Subscribe will unlock once Stripe is live on the API.</Flash>
      )}
      {presentment && (
        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1rem' }}>{presentment}</p>
      )}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {plans.map((plan) => (
          <Card key={plan.id} title={plan.label} subtitle={`From £${plan.priceGbp.toFixed(2)} / month`}>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#444', minHeight: 100 }}>
              {plan.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <button
              style={{ ...btnStyle, width: '100%', marginTop: '0.75rem', opacity: loading || !stripeReady ? 0.6 : 1 }}
              disabled={!!loading || !stripeReady}
              onClick={() => subscribe(plan.id)}
            >
              {loading === plan.id ? 'Redirecting…' : stripeReady ? 'Subscribe' : 'Coming soon'}
            </button>
          </Card>
        ))}
      </div>
    </main>
  );
}
