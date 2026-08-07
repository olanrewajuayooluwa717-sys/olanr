'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#f0f7fa' }}>
        <main style={{ maxWidth: 480, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ color: '#0d4f6e' }}>Fishmaster</h1>
          <p style={{ color: '#555', marginBottom: '1.5rem' }}>{error.message || 'Application error.'}</p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#0d4f6e', color: '#fff', border: 'none', borderRadius: 6,
              padding: '0.5rem 1rem', cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
