'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, btnStyle, inputStyle } from '../../components/Shell';
import { BrandLogo } from '../../components/BrandLogo';
import { login, setAuth } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await login(email, password);
      setAuth(token, undefined, { ...user, email });
      router.push(user.role === 'super_admin' || user.role === 'manager' ? '/admin' : '/');
    } catch (err) {
      setError(String(err).replace('Error: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100dvh',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: 440,
        margin: '0 auto',
        padding: 'max(1.25rem, env(safe-area-inset-top)) 1rem max(1.5rem, env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: '#f0f7fa',
      }}
    >
      <div style={{ marginBottom: '1.1rem' }}>
        <BrandLogo variant="full" href="/" />
      </div>
      <h1 style={{ color: '#0d4f6e', margin: '0 0 0.35rem', fontSize: '1.6rem' }}>Welcome back</h1>
      <p style={{ color: '#64748b', margin: '0 0 1.25rem', fontSize: '0.95rem' }}>
        Sign in to your farm dashboard, reports, and daily logs.
      </p>
      <form onSubmit={submit}>
        <Card title="Sign in">
          <label style={{ display: 'block', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#555' }}>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ ...inputStyle, display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#555' }}>Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
            />
          </label>
          {error && <p style={{ color: 'crimson', fontSize: '0.9rem' }}>{error}</p>}
          <button type="submit" style={{ ...btnStyle, width: '100%' }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p style={{ margin: '0.85rem 0 0', textAlign: 'center', fontSize: '0.85rem' }}>
            <Link href="/forgot-password" style={{ color: '#0d4f6e' }}>
              Forgot password?
            </Link>
          </p>
        </Card>
      </form>
      <p style={{ marginTop: '1.25rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
        New farm?{' '}
        <Link href="/register" style={{ color: '#0d4f6e', fontWeight: 600 }}>
          Create an account
        </Link>
      </p>
    </main>
  );
}
