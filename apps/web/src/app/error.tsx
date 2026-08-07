'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ maxWidth: 480, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ color: '#0d4f6e' }}>Something went wrong</h1>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>{error.message || 'An unexpected error occurred.'}</p>
      <button
        type="button"
        onClick={reset}
        style={{
          background: '#0d4f6e', color: '#fff', border: 'none', borderRadius: 6,
          padding: '0.5rem 1rem', cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </main>
  );
}
