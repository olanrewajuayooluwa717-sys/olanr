'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { clearAuth, getToken, getRole, getEmail } from '../lib/api';

const NAV_LINKS = [
  { href: '/', label: 'Home', match: (p: string) => p === '/' },
  { href: '/economics', label: 'Economics', match: (p: string) => p.startsWith('/economics') },
  { href: '/marketplace', label: 'Marketplace', match: (p: string) => p.startsWith('/marketplace') },
  { href: '/reports', label: 'Reports', match: (p: string) => p.startsWith('/reports') },
  { href: '/messages', label: 'Messages', match: (p: string) => p.startsWith('/messages'), auth: true },
  { href: '/subscribe', label: 'Plans', match: (p: string) => p.startsWith('/subscribe') },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    setLoggedIn(!!getToken());
    const role = getRole();
    setIsAdmin(role === 'super_admin' || role === 'manager');
    setEmail(getEmail());
  }, [pathname]);

  const logout = () => {
    clearAuth();
    setLoggedIn(false);
    window.location.href = '/login';
  };

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f7fa' }}>
      <nav
        style={{
          background: '#0d4f6e',
          color: '#fff',
          padding: '0.65rem 1.25rem',
          display: 'flex',
          gap: '0.35rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Link href="/" style={{ color: '#fff', fontWeight: 700, textDecoration: 'none', marginRight: '0.75rem', fontSize: '1.05rem' }}>
          Fishmaster
        </Link>
        {NAV_LINKS.filter((l) => !('auth' in l && l.auth) || loggedIn).map((link) => {
          const active = link.match(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                color: active ? '#fff' : '#b8d4e3',
                textDecoration: 'none',
                padding: '0.35rem 0.7rem',
                borderRadius: 6,
                background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                fontWeight: active ? 600 : 400,
                fontSize: '0.9rem',
              }}
            >
              {link.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            style={{
              color: '#0d4f6e',
              background: '#fcd34d',
              textDecoration: 'none',
              padding: '0.35rem 0.7rem',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            Admin
          </Link>
        )}
        <span style={{ flex: 1 }} />
        {loggedIn ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {email && (
              <span style={{ fontSize: '0.8rem', color: '#b8d4e3', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email}
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              style={{
                background: 'transparent',
                border: '1px solid #b8d4e3',
                color: '#fff',
                borderRadius: 6,
                padding: '0.3rem 0.75rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link href="/register" style={{ color: '#b8d4e3', textDecoration: 'none', fontSize: '0.9rem' }}>
              Register
            </Link>
            <Link
              href="/login"
              style={{
                color: '#0d4f6e',
                background: '#fff',
                textDecoration: 'none',
                padding: '0.35rem 0.85rem',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              Login
            </Link>
          </div>
        )}
      </nav>
      {children}
    </div>
  );
}

export function Card({ title, children, subtitle }: { title: string; children: React.ReactNode; subtitle?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h2 style={{ margin: 0, fontSize: '1rem', color: '#0d4f6e' }}>{title}</h2>
      {subtitle ? (
        <p style={{ margin: '0.25rem 0 0.85rem', fontSize: '0.85rem', color: '#64748b' }}>{subtitle}</p>
      ) : (
        <div style={{ height: '0.75rem' }} />
      )}
      {children}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
      <p style={{ margin: 0, fontWeight: 600, color: '#475569' }}>{title}</p>
      {hint && <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem' }}>{hint}</p>}
    </div>
  );
}

export function Flash({ tone = 'info', children }: { tone?: 'info' | 'ok' | 'warn' | 'danger'; children: React.ReactNode }) {
  const colors = {
    info: { bg: '#e0f2fe', fg: '#0369a1' },
    ok: { bg: '#f0fdf4', fg: '#15803d' },
    warn: { bg: '#fff7ed', fg: '#c2410c' },
    danger: { bg: '#fef2f2', fg: '#b91c1c' },
  }[tone];
  return (
    <p style={{ color: colors.fg, fontWeight: 600, background: colors.bg, padding: '0.75rem 1rem', borderRadius: 8, margin: '0 0 1rem' }}>
      {children}
    </p>
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
  padding: '0.45rem 0.65rem',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: '0.9rem',
};
