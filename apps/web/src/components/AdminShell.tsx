'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { clearAuth, getEmail, getRole } from '../lib/api';

export type AdminSection =
  | 'members'
  | 'directory'
  | 'broadcasts'
  | 'messages'
  | 'reports'
  | 'staff'
  | 'marketplace'
  | 'config';

const NAV: {
  id: AdminSection;
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}[] = [
  { id: 'members', label: 'Members', href: '/admin?section=members' },
  { id: 'directory', label: 'By location', href: '/admin?section=directory' },
  { id: 'reports', label: 'Reports', href: '/admin?section=reports' },
  { id: 'staff', label: 'Staff', href: '/admin?section=staff' },
  {
    id: 'marketplace',
    label: 'Marketplace',
    href: '/admin?section=marketplace',
    children: [
      { label: 'Products', href: '/admin?section=marketplace&tab=products' },
      { label: 'Categories', href: '/admin?section=marketplace&tab=categories' },
    ],
  },
  { id: 'broadcasts', label: 'Broadcasts', href: '/admin?section=broadcasts' },
  { id: 'messages', label: 'Messages', href: '/admin?section=messages' },
  { id: 'config', label: 'Configurations', href: '/admin?section=config' },
];

export function parseAdminSection(raw: string | null): AdminSection {
  if (raw && NAV.some((n) => n.id === raw)) return raw as AdminSection;
  return 'members';
}

export function AdminShell({
  children,
  section: sectionProp,
}: {
  children: React.ReactNode;
  section?: AdminSection;
}) {
  const searchParams = useSearchParams();
  const active = sectionProp ?? parseAdminSection(searchParams.get('section'));
  const email = getEmail();
  const role = getRole();
  const [navOpen, setNavOpen] = useState(false);

  const logout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <div className="admin-root" style={styles.root}>
      <button
        type="button"
        className={`admin-backdrop${navOpen ? ' is-open' : ''}`}
        aria-label="Close menu"
        onClick={() => setNavOpen(false)}
      />
      <aside className={`admin-sidebar${navOpen ? ' is-open' : ''}`} style={styles.sidebar}>
        <div style={styles.brandBlock}>
          <Link href="/admin" style={styles.brand}>
            Fishmaster
          </Link>
          <span style={styles.brandSub}>Admin</span>
        </div>

        <nav style={styles.nav}>
          {NAV.map((item) => {
            const isActive = active === item.id;
            return (
              <div key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setNavOpen(false)}
                  style={{
                    ...styles.navItem,
                    ...(isActive ? styles.navItemActive : {}),
                  }}
                >
                  <NavIcon id={item.id} active={isActive} />
                  <span>{item.label}</span>
                </Link>
                {item.children && isActive && (
                  <div style={styles.subNav}>
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href} onClick={() => setNavOpen(false)} style={styles.subNavItem}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.adminChip}>
            <div style={styles.avatar}>{(email?.[0] ?? 'A').toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div style={styles.adminRole}>{role === 'super_admin' ? 'Admin' : 'Manager'}</div>
              <div style={styles.adminEmail}>{email ?? '—'}</div>
            </div>
          </div>
          <button type="button" onClick={logout} style={styles.logoutBtn} title="End session and logout">
            Logout
          </button>
          <Link href="/" style={styles.backLink}>
            ← Member app
          </Link>
        </div>
      </aside>

      <div style={styles.main}>
        <header className="admin-topbar" style={styles.topbar}>
          <button
            type="button"
            className="admin-menu-btn"
            aria-label="Open menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <nav style={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/admin" style={styles.crumbLink}>
              Home
            </Link>
            <span style={styles.crumbSep}>/</span>
            <span style={styles.crumbCurrent}>
              {NAV.find((n) => n.id === active)?.label ?? 'Admin'}
            </span>
          </nav>
          <span className="admin-env" style={styles.envHint}>Administrative backend</span>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}

function NavIcon({ id, active }: { id: AdminSection; active: boolean }) {
  const color = active ? '#0d9488' : '#64748b';
  const common = { width: 18, height: 18, flexShrink: 0 };
  switch (id) {
    case 'members':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'directory':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={common}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case 'reports':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={common}>
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 5 4-7" />
        </svg>
      );
    case 'staff':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'marketplace':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={common}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      );
    case 'broadcasts':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={common}>
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      );
    case 'messages':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={common}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'config':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );
    default:
      return null;
  }
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    background: '#f8fafc',
    color: '#0f172a',
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
  },
  sidebar: {
    background: '#fff',
    borderRight: '1px solid #e2e8f0',
  },
  brandBlock: {
    padding: '1.25rem 1.25rem 1rem',
    borderBottom: '1px solid #f1f5f9',
  },
  brand: {
    display: 'block',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0f172a',
    textDecoration: 'none',
    letterSpacing: '-0.02em',
  },
  brandSub: {
    display: 'block',
    fontSize: '0.7rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginTop: 2,
  },
  nav: {
    flex: 1,
    padding: '0.75rem 0.75rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.65rem 0.75rem',
    borderRadius: 8,
    color: '#475569',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  navItemActive: {
    background: '#ccfbf1',
    color: '#0f766e',
  },
  subNav: {
    padding: '0.15rem 0 0.35rem 2.4rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  subNavItem: {
    fontSize: '0.8rem',
    color: '#64748b',
    textDecoration: 'none',
    padding: '0.35rem 0.5rem',
    borderRadius: 6,
  },
  sidebarFooter: {
    padding: '1rem',
    borderTop: '1px solid #f1f5f9',
    display: 'grid',
    gap: '0.5rem',
  },
  adminChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#0d9488',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 600,
    fontSize: '0.85rem',
    flexShrink: 0,
  },
  adminRole: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  adminEmail: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '0.4rem 0.75rem',
    cursor: 'pointer',
    fontSize: '0.8rem',
    color: '#64748b',
  },
  backLink: {
    fontSize: '0.75rem',
    color: '#0d9488',
    textDecoration: 'none',
  },
  main: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  topbar: {
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    justifyContent: 'space-between',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.85rem',
  },
  crumbLink: {
    color: '#94a3b8',
    textDecoration: 'none',
  },
  crumbSep: { color: '#cbd5e1' },
  crumbCurrent: { color: '#0f172a', fontWeight: 600 },
  envHint: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
};

export function AdminPanel({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-panel" style={panelStyles.panel}>
      <div style={panelStyles.header}>
        <h1 style={panelStyles.title}>
          {title}
          {typeof count === 'number' && (
            <span style={panelStyles.count}>({count})</span>
          )}
        </h1>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AdminTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={['admin-table-wrap', className].filter(Boolean).join(' ')} style={{ overflowX: 'auto' }}>
      <table style={panelStyles.table}>{children}</table>
    </div>
  );
}

export const adminBtn: React.CSSProperties = {
  background: '#14b8a6',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.55rem 1rem',
  minHeight: 44,
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontWeight: 600,
};

export const adminBtnGhost: React.CSSProperties = {
  ...adminBtn,
  background: '#f1f5f9',
  color: '#334155',
};

export const adminBtnDanger: React.CSSProperties = {
  ...adminBtn,
  background: '#dc2626',
};

export const adminInput: React.CSSProperties = {
  padding: '0.5rem 0.7rem',
  borderRadius: 6,
  border: '1px solid #e2e8f0',
  fontSize: '16px',
  minHeight: 44,
  background: '#fff',
  width: '100%',
  boxSizing: 'border-box',
};

export const adminSearch: React.CSSProperties = {
  ...adminInput,
  maxWidth: 280,
  minHeight: 44,
};

const panelStyles: Record<string, React.CSSProperties> = {
  panel: {
    background: '#fff',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    padding: '1.25rem 1.35rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: 600,
    color: '#0f172a',
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.35rem',
  },
  count: {
    fontSize: '0.95rem',
    fontWeight: 500,
    color: '#94a3b8',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
};
