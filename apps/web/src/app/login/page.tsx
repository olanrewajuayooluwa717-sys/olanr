'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, btnStyle, inputStyle } from '../../components/Shell';
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
      setAuth(token, undefined, user);
      router.push(user.role === 'super_admin' || user.role === 'manager' ? '/admin' : '/');
    } catch (err) {
      setError(String(err).replace('Error: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ color: '#0d4f6e' }}>Login</h1>
      <form onSubmit={submit}>
        <Card title="Member account">
          <label style={{ display: 'block', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#555' }}>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              style={{ ...inputStyle, display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
          </label>
          <label style={{ display: 'block', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#555' }}>Password</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
          </label>
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
          <button type="submit" style={btnStyle} disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </Card>
      </form>
    </main>
  );
}
