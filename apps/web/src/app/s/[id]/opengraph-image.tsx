import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API_URL =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/api/content/share/${id}`, { cache: 'no-store' });
  const data = res.ok ? await res.json() : null;
  const title = data?.post?.title ?? 'Fishmaster';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 64,
          background: 'linear-gradient(160deg, #0d4f6e 0%, #155e75 55%, #0f766e 100%)',
          color: 'white',
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.85 }}>
          Fishmaster
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, marginTop: 18, maxWidth: 1000 }}>
          {title}
        </div>
      </div>
    ),
    size,
  );
}
