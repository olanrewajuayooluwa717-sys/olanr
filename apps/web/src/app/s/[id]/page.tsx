import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { ShareCta } from '../../../components/ShareCta';
import { isVideoMedia, mediaSrc } from '../../../lib/api';

const API_URL =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

type SharedPost = {
  id: string;
  type: string;
  title: string;
  body: string;
  mediaUrl: string | null;
  createdAt: string;
  author: { name: string };
};

type Teaser = {
  id: string;
  type: string;
  title: string;
  excerpt: string;
  mediaUrl: string | null;
};

async function loadShare(id: string): Promise<{ post: SharedPost; more: Teaser[] } | null> {
  const res = await fetch(`${API_URL}/api/content/share/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function siteUrl() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

function blurb(body: string) {
  const text = body.replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await loadShare(id);
  const site = await siteUrl();
  if (!data) {
    return { title: 'Fishmaster' };
  }
  const description = blurb(data.post.body) || 'Read this on Fishmaster';
  const url = `${site}/s/${data.post.id}`;
  const image = data.post.mediaUrl && data.post.type === 'picture'
    ? mediaSrc(data.post.mediaUrl)
    : `${url}/opengraph-image`;
  return {
    title: `${data.post.title} · Fishmaster`,
    description,
    openGraph: {
      title: data.post.title,
      description,
      url,
      siteName: 'Fishmaster',
      type: 'article',
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.post.title,
      description,
      images: [image],
    },
  };
}

const TYPE_LABEL: Record<string, string> = {
  article: 'Article',
  information: 'Information',
  picture: 'Picture',
  video: 'Video',
  advert: 'Advert',
  education: 'Article',
};

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadShare(id);

  if (!data) {
    return (
      <main className="phone-frame" style={shell}>
        <p>This post is no longer available.</p>
        <a href="/register" style={{ color: '#0d4f6e', fontWeight: 700 }}>Register on Fishmaster</a>
      </main>
    );
  }

  const { post, more } = data;

  return (
    <main className="phone-frame" style={shell}>
      <p style={{ margin: '4px 0 0', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0d4f6e', fontWeight: 700 }}>
        Fishmaster
      </p>
      <h1 style={{ margin: '8px 0 4px', fontSize: '1.45rem', letterSpacing: '-0.03em', lineHeight: 1.2 }}>{post.title}</h1>
      <p style={{ margin: 0, color: '#737373', fontSize: '0.8rem' }}>
        {new Date(post.createdAt).toLocaleDateString()} · {post.author.name}
      </p>
      {post.mediaUrl && (post.type === 'video' || isVideoMedia(post.mediaUrl)) && (
        <video src={mediaSrc(post.mediaUrl)} controls playsInline style={{ width: '100%', marginTop: 14, borderRadius: 12, background: '#000' }} />
      )}
      {post.mediaUrl && post.type !== 'video' && !isVideoMedia(post.mediaUrl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaSrc(post.mediaUrl)} alt="" style={{ width: '100%', marginTop: 14, borderRadius: 12, maxHeight: 320, objectFit: 'cover' }} />
      )}
      <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55, fontSize: '1rem' }}>{post.body}</p>

      <section style={{ marginTop: 8, padding: '14px 0 8px', borderTop: '1px solid #efefef' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '1rem' }}>More on Fishmaster</h2>
        <p style={{ margin: '0 0 12px', color: '#737373', fontSize: '0.85rem' }}>
          Pictures, videos and the rest of the library open after you register.
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          {more.map((item) => (
            <a key={item.id} href="/register" style={locked}>
              {item.mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaSrc(item.mediaUrl)} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <span style={thumb}>{TYPE_LABEL[item.type] ?? 'Post'}</span>
              )}
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem' }}>{item.title}</span>
                <span style={{ display: 'block', color: '#737373', fontSize: '0.78rem', marginTop: 2 }}>
                  {TYPE_LABEL[item.type] ?? item.type} · Register to open
                </span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16, padding: 14, background: '#f8fafc', borderRadius: 14 }}>
        <strong>Also in the app</strong>
        <p style={{ margin: '6px 0 0', color: '#525252', fontSize: '0.88rem', lineHeight: 1.45 }}>
          Daily pond feed plan, water checks, and the marketplace — free to join.
        </p>
      </section>

      <div style={{ position: 'sticky', bottom: 12, marginTop: 18 }}>
        <ShareCta shareId={post.id} />
      </div>
    </main>
  );
}

const shell: React.CSSProperties = {
  padding: '12px 16px 28px',
  background: '#fff',
  minHeight: '70vh',
  color: '#262626',
};

const locked: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  textDecoration: 'none',
  color: 'inherit',
  padding: '8px 0',
  borderBottom: '1px solid #f5f5f5',
};

const thumb: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 8,
  background: '#e8f4f8',
  color: '#0d4f6e',
  fontSize: '0.65rem',
  fontWeight: 700,
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
  padding: 4,
  flexShrink: 0,
};
