'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../components/Shell';
import { apiFetch, getToken } from '../../lib/api';

type Message = {
  id: string;
  title: string;
  body: string;
  reportNum: number | null;
  pondLabel?: string | null;
  read: boolean;
  createdAt: string;
};

export default function MessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    apiFetch('/api/messages')
      .then(setMessages)
      .catch((e) => setError(String(e)));
  }, [router]);

  const markRead = async (id: string) => {
    await apiFetch(`/api/messages/${id}/read`, { method: 'PATCH' });
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ color: '#0d4f6e' }}>Messages from Fishmaster</h1>
      <p style={{ color: '#555' }}>Personal reports and pond advice sent by admin.</p>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {messages.length === 0 && !error && <p style={{ color: '#666' }}>No messages yet.</p>}
      {messages.map((m) => (
        <Card key={m.id} title={m.title}>
          <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 0.5rem' }}>
            {new Date(m.createdAt).toLocaleString()}
            {m.pondLabel ? ` · ${m.pondLabel}` : ''}
            {m.reportNum ? ` · Report ${m.reportNum}` : ''}
            {!m.read && ' · New'}
          </p>
          <p style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{m.body}</p>
          {!m.read && (
            <button
              onClick={() => markRead(m.id)}
              style={{ marginTop: '0.75rem', background: '#0d4f6e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.4rem 0.75rem', cursor: 'pointer' }}
            >
              Mark as read
            </button>
          )}
        </Card>
      ))}
    </main>
  );
}
