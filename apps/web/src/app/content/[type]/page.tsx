'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CONTENT_CATEGORIES } from '@fishmaster/shared-types';
import { Card } from '../../../components/Shell';
import { API_URL } from '../../../lib/api';

type Post = {
  id: string;
  type: string;
  title: string;
  body: string;
  mediaUrl: string | null;
  createdAt: string;
  author: { name: string };
};

export default function ContentFeedPage() {
  const params = useParams();
  const type = String(params.type);
  const category = CONTENT_CATEGORIES.find((c) => c.type === type);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/content?type=${type}`)
      .then((r) => r.json())
      .then(setPosts)
      .catch((e) => setError(String(e)));
  }, [type]);

  if (!category) {
    return <main style={{ padding: '2rem' }}><p>Unknown content type.</p></main>;
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ color: '#0d4f6e' }}>{category.icon} {category.label}</h1>
      <p style={{ color: '#555' }}>Broadcast to all members from Admin → Send to all.</p>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {posts.length === 0 && !error && <p style={{ color: '#666' }}>No posts yet.</p>}
      {posts.map((p) => (
        <Card key={p.id} title={p.title}>
          <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 0.5rem' }}>
            {new Date(p.createdAt).toLocaleDateString()} · {p.author.name}
          </p>
          {p.mediaUrl && (
            type === 'video' ? (
              <video src={p.mediaUrl} controls style={{ width: '100%', maxHeight: 320, marginBottom: '0.75rem', borderRadius: 8 }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.mediaUrl} alt="" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', marginBottom: '0.75rem', borderRadius: 8 }} />
            )
          )}
          <p style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{p.body}</p>
        </Card>
      ))}
    </main>
  );
}
