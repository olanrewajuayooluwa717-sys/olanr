'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, btnStyle, inputStyle } from '../../components/Shell';
import { apiFetch, getRole } from '../../lib/api';

type Member = {
  id: string; name: string; email: string; role: string;
  subscriptionStatus: string; subscriptionTier: string;
  _count: { farms: number };
};

type Post = {
  id: string; type: string; title: string; body: string;
  published: boolean; createdAt: string;
  author: { name: string };
};

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'posts' | 'members'>('posts');
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [form, setForm] = useState({ type: 'education', title: '', body: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const role = getRole();
    if (role !== 'super_admin' && role !== 'manager') {
      router.push('/login');
      return;
    }
    load();
  }, [router]);

  const load = async () => {
    try {
      const [m, p] = await Promise.all([
        apiFetch('/api/admin/members'),
        apiFetch('/api/admin/posts'),
      ]);
      setMembers(m);
      setPosts(p);
    } catch (e) {
      setError(String(e));
    }
  };

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/posts', { method: 'POST', body: JSON.stringify(form) });
    setForm({ type: 'education', title: '', body: '' });
    load();
  };

  const suspend = async (id: string) => {
    await apiFetch(`/api/admin/members/${id}/suspend`, { method: 'PATCH' });
    load();
  };

  const activate = async (id: string) => {
    await apiFetch(`/api/admin/members/${id}/activate`, { method: 'PATCH' });
    load();
  };

  const deletePost = async (id: string) => {
    await apiFetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ color: '#0d4f6e' }}>Admin Panel</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button style={tabBtn(tab === 'posts')} onClick={() => setTab('posts')}>Broadcast</button>
        <button style={tabBtn(tab === 'members')} onClick={() => setTab('members')}>Members</button>
      </div>

      {tab === 'posts' && (
        <section style={{ display: 'grid', gap: '1rem' }}>
          <Card title="Send to all members">
            <form onSubmit={createPost} style={{ display: 'grid', gap: '0.75rem' }}>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                <option value="education">Education</option>
                <option value="information">Information</option>
                <option value="advert">Advert (educational)</option>
              </select>
              <input placeholder="Title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} />
              <textarea placeholder="Message body" required rows={4} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} style={inputStyle} />
              <button type="submit" style={btnStyle}>Publish to all members</button>
            </form>
          </Card>
          <Card title="Published posts">
            {posts.map((p) => (
              <div key={p.id} style={{ borderTop: '1px solid #eee', padding: '0.75rem 0' }}>
                <strong>[{p.type}] {p.title}</strong>
                <p style={{ margin: '0.25rem 0', color: '#555', fontSize: '0.9rem' }}>{p.body.slice(0, 120)}…</p>
                <button onClick={() => deletePost(p.id)} style={{ ...btnStyle, background: '#b91c1c', fontSize: '0.8rem' }}>Delete</button>
              </div>
            ))}
          </Card>
        </section>
      )}

      {tab === 'members' && (
        <Card title="Members">
          <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th align="left">Name</th><th>Status</th><th>Role</th><th></th></tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderTop: '1px solid #eee' }}>
                  <td>{m.name}<br /><small>{m.email}</small></td>
                  <td align="center">{m.subscriptionStatus}</td>
                  <td align="center">{m.role}</td>
                  <td align="right">
                    {m.subscriptionStatus === 'active' ? (
                      <button onClick={() => suspend(m.id)} style={{ ...btnStyle, background: '#b91c1c', fontSize: '0.75rem' }}>Suspend</button>
                    ) : (
                      <button onClick={() => activate(m.id)} style={{ ...btnStyle, background: '#15803d', fontSize: '0.75rem' }}>Activate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}

function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: '0.4rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer',
    background: active ? '#0d4f6e' : '#e2e8f0', color: active ? '#fff' : '#333',
  };
}
