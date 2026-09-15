'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { clearAuth, getToken, getRole, getEmail } from '../lib/api';
import { DesktopTodayRail } from './DesktopTodayRail';

const NAV_LINKS = [
  { href: '/', label: 'Home', match: (p: string) => p === '/' || p.startsWith('/display') },
  { href: '/content/video', label: 'Videos', match: (p: string) => p.startsWith('/content/video') },
  { href: '/marketplace', label: 'Marketplace', match: (p: string) => p.startsWith('/marketplace') },
  { href: '/reports', label: 'Reports', match: (p: string) => p.startsWith('/reports') },
  { href: '/messages', label: 'Messages', match: (p: string) => p.startsWith('/messages'), auth: true },
  { href: '/subscribe', label: 'Plans', match: (p: string) => p.startsWith('/subscribe') },
  { href: '/economics', label: 'Economics', match: (p: string) => p.startsWith('/economics'), staffOnly: true },
] as const;

function visibleLinks(loggedIn: boolean, isAdmin: boolean) {
  return NAV_LINKS.filter((l) => {
    if ('auth' in l && l.auth && !loggedIn) return false;
    if ('staffOnly' in l && l.staffOnly && !isAdmin) return false;
    return true;
  });
}

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

  const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname.startsWith('/forgot-password');
  if (isAdminRoute || isAuthRoute) {
    return <>{children}</>;
  }

  const links = visibleLinks(loggedIn, isAdmin);

  return (
    <div className="member-main" style={{ minHeight: '100vh', background: '#f0f7fa' }}>
      <nav
        className="member-nav"
        style={{
          background: '#0d4f6e',
          color: '#fff',
          padding: '0.65rem 1.25rem',
        }}
      >
        <div className="member-nav-inner">
          <Link href="/" style={{ color: '#fff', fontWeight: 700, textDecoration: 'none', marginRight: '0.75rem', fontSize: '1.05rem' }}>
            Fishmaster
          </Link>
          <span className="member-nav-links" style={{ display: 'contents' }}>
            {links.map((link) => {
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
          </span>
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
                <span className="member-email" style={{ fontSize: '0.8rem', color: '#b8d4e3', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        </div>
      </nav>

      <div className="member-body">
        <aside className="member-side" aria-label="Main">
          <Link href="/" className="side-brand">
            Fishmaster
          </Link>
          <nav className="side-nav">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={link.match(pathname) ? 'is-active' : undefined}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin" className={pathname.startsWith('/admin') ? 'is-active side-admin' : 'side-admin'}>
                Admin
              </Link>
            )}
          </nav>
          <div className="side-foot">
            {loggedIn ? (
              <>
                {email && <span className="side-email">{email}</span>}
                <button type="button" onClick={logout} className="side-logout">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="side-logout">Sign in</Link>
                <Link href="/register" className="rail-ghost">Register</Link>
              </>
            )}
          </div>
        </aside>

        <div className="member-center">{children}</div>
        <DesktopTodayRail />
      </div>

      <PhoneTabBar pathname={pathname} loggedIn={loggedIn} isAdmin={isAdmin} onLogout={logout} />
    </div>
  );
}

function PhoneTabBar({
  pathname,
  loggedIn,
  isAdmin,
  onLogout,
}: {
  pathname: string;
  loggedIn: boolean;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  const [more, setMore] = useState(false);
  const moreActive = pathname.startsWith('/messages') || pathname.startsWith('/subscribe') || pathname.startsWith('/economics') || pathname.startsWith('/reports');
  const tabs = [
    { href: '/', label: 'Home', icon: 'home', match: pathname === '/' || pathname.startsWith('/display') },
    { href: '/content/video', label: 'Videos', icon: 'video', match: pathname.startsWith('/content/video') },
    { href: '/marketplace', label: 'Market', icon: 'market', match: pathname.startsWith('/marketplace') },
  ];

  return (
    <>
      {more && (
        <button type="button" className="phone-more-backdrop" aria-label="Close menu" onClick={() => setMore(false)} />
      )}
      {more && (
        <div className="phone-more" role="menu">
          {loggedIn && <Link href="/messages" onClick={() => setMore(false)}>Messages</Link>}
          <Link href="/reports" onClick={() => setMore(false)}>Reports</Link>
          <Link href="/subscribe" onClick={() => setMore(false)}>Plans</Link>
          {isAdmin && <Link href="/economics" onClick={() => setMore(false)}>Economics</Link>}
          {isAdmin && <Link href="/admin" onClick={() => setMore(false)}>Admin</Link>}
          {loggedIn && (
            <button type="button" onClick={onLogout}>Log out</button>
          )}
        </div>
      )}
      <nav className="member-bottom" aria-label="App">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className={tab.match ? 'is-active' : undefined}>
            <TabIcon name={tab.icon} />
            <span>{tab.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className={more || moreActive ? 'is-active' : undefined}
          onClick={() => setMore((open) => !open)}
        >
          <TabIcon name="more" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}

function TabIcon({ name }: { name: string }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': true as const };
  if (name === 'home') {
    return <svg {...common}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /></svg>;
  }
  if (name === 'market') {
    return <svg {...common}><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>;
  }
  if (name === 'video') {
    return <svg {...common}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-2v8l-5-2z" /></svg>;
  }
  return <svg {...common}><circle cx="6" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="18" cy="12" r="1.2" fill="currentColor" /></svg>;
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
  padding: '0.65rem 1rem',
  minHeight: 44,
  cursor: 'pointer',
  fontSize: '1rem',
};

export const inputStyle: React.CSSProperties = {
  padding: '0.65rem 0.75rem',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: '16px',
  minHeight: 44,
};
