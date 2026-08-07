import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ maxWidth: 480, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ color: '#0d4f6e' }}>Page not found</h1>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>That page does not exist.</p>
      <Link href="/" style={{ color: '#0d4f6e' }}>Back to dashboard</Link>
    </main>
  );
}
