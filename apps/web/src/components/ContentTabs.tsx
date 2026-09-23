'use client';

import { useEffect, useMemo, useState } from 'react';
import { API_URL, authHeaders, clearAuth, getToken, isVideoMedia, mediaSrc } from '../lib/api';

export const CONTENT_TABS = [
  { id: 'article', label: 'Articles' },
  { id: 'information', label: 'Information' },
  { id: 'picture', label: 'Pictures' },
  { id: 'video', label: 'Videos' },
] as const;

export type ContentTabId = (typeof CONTENT_TABS)[number]['id'];

type Post = {
  id: string;
  type: string;
  title: string;
  body: string;
  mediaUrl: string | null;
  createdAt: string;
  author: { name: string };
};

export function ContentTabs({ initial = 'article' }: { initial?: string }) {
  const start = CONTENT_TABS.some((t) => t.id === initial) ? initial : 'article';
  const [tab, setTab] = useState(start);
  const [posts, setPosts] = useState<Post[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [ads, setAds] = useState<Post[]>([]);
  const [openAdId, setOpenAdId] = useState<string | null>(null);

  useEffect(() => {
    setTab(start);
  }, [start]);

  useEffect(() => {
    setPosts([]);
    setOpenId(null);
    setQuery('');
    setError(null);
    const signedIn = !!getToken();
    setLocked(!signedIn);
    const url = signedIn
      ? `${API_URL}/api/content?type=${tab}`
      : `${API_URL}/api/content/preview?type=${tab}`;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url, signedIn ? { headers: authHeaders() } : undefined);
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.status === 401) {
          clearAuth();
          setLocked(true);
          setPosts([]);
          setError('Session expired — sign in again to open articles.');
          return;
        }
        if (!res.ok) {
          setPosts([]);
          setError(typeof data?.error === 'string' ? data.error : `Could not load content (${res.status})`);
          return;
        }
        if (!Array.isArray(data)) {
          setPosts([]);
          setError('Could not load content.');
          return;
        }
        setPosts(data);
      } catch (e) {
        if (!cancelled) {
          setPosts([]);
          setError(String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    fetch(`${API_URL}/api/content/ads?place=${tab}`)
      .then((r) => r.json())
      .then((data) => setAds(Array.isArray(data) ? data : []))
      .catch(() => setAds([]));
  }, [tab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q));
  }, [posts, query]);

  const openIndex = filtered.findIndex((p) => p.id === openId);
  const open = openIndex >= 0 ? filtered[openIndex] : null;

  const switchTab = (id: string) => {
    setTab(id);
    setOpenId(null);
  };

  const sessionExpired = !!error && error.startsWith('Session expired');

  return (
    <section>
      <div role="tablist" style={tabBar}>
        {CONTENT_TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => switchTab(t.id)}
              style={{
                flex: '0 0 auto',
                border: 'none',
                background: 'transparent',
                padding: '10px 2px 8px',
                marginRight: 16,
                fontSize: '0.86rem',
                fontWeight: on ? 700 : 500,
                color: on ? '#262626' : '#a3a3a3',
                borderBottom: on ? '1px solid #262626' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p style={{ color: '#b91c1c', fontSize: '0.85rem', padding: '8px 0' }}>
          {error}{' '}
          {sessionExpired && (
            <a href="/login" style={{ color: '#0d4f6e', fontWeight: 700 }}>
              Sign in →
            </a>
          )}
        </p>
      )}

      {open ? (
        <Reader
          post={open}
          index={openIndex}
          total={filtered.length}
          kind={tab}
          onBack={() => setOpenId(null)}
          onPrev={openIndex > 0 ? () => setOpenId(filtered[openIndex - 1]!.id) : undefined}
          onNext={openIndex < filtered.length - 1 ? () => setOpenId(filtered[openIndex + 1]!.id) : undefined}
        />
      ) : (
        <>
          {tab !== 'picture' && posts.length > 0 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === 'video' ? 'Search videos' : 'Search titles'}
              style={search}
            />
          )}
          {locked && posts.length > 0 && (
            <a href="/register" style={{ display: 'block', marginTop: 12, color: '#0d4f6e', fontWeight: 700, fontSize: '0.9rem' }}>
              Register to open articles, pictures and videos →
            </a>
          )}
          {!error && filtered.length === 0 && (
            <p style={{ color: '#737373', fontSize: '0.88rem', padding: '12px 0 4px' }}>Nothing in this tab yet.</p>
          )}
          {ads[0] && <Sponsored post={ads[0]} open={openAdId === ads[0].id} onToggle={() => setOpenAdId(openAdId === ads[0].id ? null : ads[0].id)} />}
          {tab === 'picture' ? (
            <div className="ig-pic-grid" style={picGrid}>
              {filtered.map((p) => (
                <button key={p.id} type="button" onClick={() => (locked ? window.location.assign('/register') : setOpenId(p.id))} style={picBtn}>
                  {p.mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaSrc(p.mediaUrl)} alt={p.title} style={pic} />
                  ) : (
                    <span style={picFallback}>{p.title}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <ul style={list}>
              {filtered.map((p, i) => {
                const ad = ads.length && (i + 1) % 3 === 0 ? ads[Math.floor(i / 3) % ads.length] : null;
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => (locked ? window.location.assign('/register') : setOpenId(p.id))} style={row}>
                      <span style={index}>{i + 1}</span>
                      <span style={{ minWidth: 0, textAlign: 'left' }}>
                        <span style={rowTitle}>{p.title}</span>
                        <span style={rowMeta}>
                          {locked
                            ? 'Register to read'
                            : `${new Date(p.createdAt).toLocaleDateString()} · ${p.body.replace(/\s+/g, ' ').slice(0, 72)}`}
                        </span>
                      </span>
                    </button>
                    {ad && ad.id !== ads[0]?.id && (
                      <Sponsored post={ad} open={openAdId === ad.id} onToggle={() => setOpenAdId(openAdId === ad.id ? null : ad.id)} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function Media({ url }: { url: string }) {
  if (isVideoMedia(url)) {
    return (
      <div className="ig-media-frame">
        <video src={mediaSrc(url)} controls playsInline style={{ width: '100%', maxHeight: 220, borderRadius: 8, background: '#000', marginTop: 8 }} />
      </div>
    );
  }
  return (
    <div className="ig-media-frame">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaSrc(url)} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
    </div>
  );
}

function Sponsored({ post, open, onToggle }: { post: Post; open: boolean; onToggle: () => void }) {
  return (
    <div style={sponsor}>
      <button type="button" onClick={onToggle} style={sponsorBtn}>
        <span style={sponsorTag}>Sponsored</span>
        <span style={rowTitle}>{post.title}</span>
        {!post.mediaUrl && <span style={rowMeta}>{post.body.replace(/\s+/g, ' ').slice(0, 90)}</span>}
      </button>
      {post.mediaUrl && <Media url={post.mediaUrl} />}
      {open && post.body.trim() && post.body.trim() !== post.title.trim() && (
        <p style={{ margin: '8px 0 0', fontSize: '0.88rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{post.body}</p>
      )}
    </div>
  );
}

function Reader({
  post, index, total, kind, onBack, onPrev, onNext,
}: {
  post: Post;
  index: number;
  total: number;
  kind: string;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
    <article style={{ paddingTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <button type="button" onClick={onBack} style={navBtn}>← All</button>
        <span style={{ fontSize: '0.78rem', color: '#737373' }}>{index + 1} of {total}</span>
      </div>
      {kind === 'video' && post.mediaUrl && (
        <div className="ig-media-frame">
          <video key={post.id} src={mediaSrc(post.mediaUrl)} controls playsInline style={{ width: '100%', maxHeight: 280, borderRadius: 12, background: '#000', marginTop: 12 }} />
        </div>
      )}
      {(kind === 'picture' || (kind !== 'video' && post.mediaUrl)) && post.mediaUrl && (
        <div className="ig-media-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaSrc(post.mediaUrl)} alt="" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 12, marginTop: 12 }} />
        </div>
      )}
      <h2 style={{ margin: '12px 0 4px', fontSize: '1.15rem', letterSpacing: '-0.02em' }}>{post.title}</h2>
      <p style={{ margin: 0, color: '#737373', fontSize: '0.75rem' }}>
        {new Date(post.createdAt).toLocaleDateString()} · {post.author.name}
      </p>
      {kind !== 'picture' && (
        <p style={{ margin: '10px 0 0', fontSize: '0.95rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{post.body}</p>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="button" onClick={onPrev} disabled={!onPrev} style={navBtn}>Previous</button>
        <button type="button" onClick={onNext} disabled={!onNext} style={{ ...navBtn, marginLeft: 'auto' }}>Next</button>
      </div>
    </article>
  );
}

const tabBar: React.CSSProperties = {
  display: 'flex',
  overflowX: 'auto',
  borderBottom: '1px solid #efefef',
};

const search: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 12,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #e5e5e5',
  fontSize: '0.9rem',
};

const list: React.CSSProperties = { listStyle: 'none', margin: '8px 0 0', padding: 0 };

const row: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  padding: '12px 0',
  border: 'none',
  borderBottom: '1px solid #f5f5f5',
  background: 'transparent',
  cursor: 'pointer',
};

const index: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: '#f5f5f5',
  color: '#0d4f6e',
  fontSize: '0.75rem',
  fontWeight: 700,
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
};

const rowTitle: React.CSSProperties = { display: 'block', fontWeight: 650, fontSize: '0.92rem' };
const rowMeta: React.CSSProperties = { display: 'block', marginTop: 2, color: '#737373', fontSize: '0.75rem' };

const navBtn: React.CSSProperties = {
  border: '1px solid #e5e5e5',
  background: '#fff',
  borderRadius: 999,
  padding: '8px 12px',
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const picGrid: React.CSSProperties = {
  // layout handled by .ig-pic-grid in device.css
};

const picBtn: React.CSSProperties = {
  position: 'relative',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  background: '#f5f5f5',
};

const pic: React.CSSProperties = {
  width: '100%',
  aspectRatio: '1',
  objectFit: 'cover',
  display: 'block',
};

const sponsor: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  marginTop: 10,
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #e8f4f8',
  background: '#f8fafc',
};

const sponsorBtn: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: 0,
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  cursor: 'pointer',
  color: 'inherit',
};

const sponsorTag: React.CSSProperties = {
  display: 'block',
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#0d4f6e',
  marginBottom: 4,
};

const picFallback: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  aspectRatio: '1',
  fontSize: '0.7rem',
  color: '#737373',
  padding: 6,
};
