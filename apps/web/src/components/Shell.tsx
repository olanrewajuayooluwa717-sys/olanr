'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearAuth, getToken, getRole } from '../lib/api';

export function Shell({ children }: { children: React.ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getToken());
    const role = getRole();
    setIsAdmin(role === 'super_admin' || role === 'manager');
  }, []);

  const logout = () => {
    clearAuth();
    setLoggedIn(false);
    window.location.href = '/login';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f7fa' }}>
      <nav style={{
        background: '#0d4f6e', color: '#fff', padding: '0.75rem 2rem',
        display: 'flex', gap: '1.5rem', alignItems: 'center',
      }}>
        <Link href="/" style={{ color: '#fff', fontWeight: 700, textDecoration: 'none' }}>Fishmaster</Link>
        <Link href="/" style={{ color: '#b8d4e3', textDecoration: 'none' }}>Dashboard</Link>
        <Link href="/reports" style={{ color: '#b8d4e3', textDecoration: 'none' }}>Reports</Link>
        <Link href="/subscribe" style={{ color: '#b8d4e3', textDecoration: 'none' }}>Subscribe</Link>
        <Link href="/register" style={{ color: '#b8d4e3', textDecoration: 'none' }}>Register</Link>
        {isAdmin && <Link href="/admin" style={{ color: '#fcd34d', textDecoration: 'none' }}>Admin</Link>}
        <span style={{ flex: 1 }} />
        {loggedIn ? (
          <button onClick={logout} style={{ background: 'transparent', border: '1px solid #b8d4e3', color: '#fff', borderRadius: 6, padding: '0.25rem 0.75rem', cursor: 'pointer' }}>Logout</button>
        ) : (
          <Link href="/login" style={{ color: '#fff', textDecoration: 'none' }}>Login</Link>
        )}
      </nav>
      {children}
    </div>
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#0d4f6e' }}>{title}</h2>
      {children}
    </div>
  );
}

export const btnStyle: React.CSSProperties = {
  background: '#0d4f6e',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.5rem 1rem',
  cursor: 'pointer',
  fontSize: '0.9rem',
};

export const inputStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem',
  borderRadius: 6,
  border: '1px solid #ccc',
  fontSize: '0.9rem',
};
