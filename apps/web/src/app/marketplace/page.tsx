'use client';

import { useEffect, useState } from 'react';
import { formatMoney, currencyFromCountry } from '@fishmaster/shared-types';
import { Card } from '../../components/Shell';
import { apiFetch, getToken } from '../../lib/api';

type Product = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string | null;
  imageUrl?: string | null;
  currency?: string | null;
  farm?: {
    name: string;
    city?: string;
    state?: string;
    country?: string;
    user?: { name: string };
  };
  category?: { title: string } | null;
};

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [viewerCurrency, setViewerCurrency] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/marketplace/products')
      .then(setProducts)
      .catch((e) => setError(String(e).replace('Error: ', '')))
      .finally(() => setLoading(false));

    if (getToken()) {
      // Prefer the member’s own farm currency / country when signed in.
      apiFetch('/api/cycles')
        .then((cycles: { pond?: { farm?: { country?: string } }; currency?: string }[]) => {
          if (!Array.isArray(cycles) || !cycles.length) return;
          const c0 = cycles[0];
          const fromCycle = c0.currency?.trim();
          const fromCountry = currencyFromCountry(c0.pond?.farm?.country);
          setViewerCurrency((fromCycle || fromCountry || 'NGN').toUpperCase());
        })
        .catch(() => {});
    }
  }, []);

  const priceLabel = (p: Product) => {
    const code = (
      p.currency
      || currencyFromCountry(p.farm?.country)
      || viewerCurrency
      || 'NGN'
    ).toUpperCase();
    return formatMoney(p.price, code);
  };

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>
      <h1 style={{ color: '#0d4f6e', margin: '0 0 0.35rem' }}>Marketplace</h1>
      <p style={{ color: '#64748b', margin: '0 0 1.25rem', fontSize: '0.95rem' }}>
        Active farm listings from Fishmaster members — fresh fish and farm products.
        Prices follow each farm’s currency (and your farm country when signed in).
      </p>

      {loading && <p style={{ color: '#64748b' }}>Loading products…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {!loading && !error && products.length === 0 && (
        <Card title="No listings yet">
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            When farms publish products, they will appear here. Check back soon.
          </p>
        </Card>
      )}

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {products.map((p) => (
          <div
            key={p.id}
            style={{
              background: '#fff',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
            ) : (
              <div style={{
                height: 100,
                background: 'linear-gradient(135deg, #0d4f6e 0%, #0d9488 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.85)',
                fontSize: '0.85rem',
              }}>
                {p.category?.title ?? 'Farm product'}
              </div>
            )}
            <div style={{ padding: '0.9rem 1rem 1.1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <strong style={{ color: '#0f172a' }}>{p.name}</strong>
              <div style={{ color: '#0d9488', fontWeight: 700, fontSize: '1.05rem' }}>{priceLabel(p)}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Quantity: {p.quantity}
                {p.farm && (
                  <> · {p.farm.name}{p.farm.city ? `, ${p.farm.city}` : ''}{p.farm.country ? ` (${p.farm.country})` : p.farm.state ? ` (${p.farm.state})` : ''}</>
                )}
              </div>
              {p.farm?.user && (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Seller: {p.farm.user.name}</div>
              )}
              {p.description && (
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>
                  {p.description.length > 120 ? `${p.description.slice(0, 120)}…` : p.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
