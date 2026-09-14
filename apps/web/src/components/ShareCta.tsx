'use client';

import { useEffect, useState } from 'react';
import { getToken } from '../lib/api';

export function ShareCta({ shareId }: { shareId: string }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(!!getToken()), []);

  if (signedIn) {
    return (
      <a href="/" style={cta}>Open your pond</a>
    );
  }

  return (
    <a href={`/register?next=/s/${shareId}`} style={cta}>
      Register free to unlock the rest
    </a>
  );
}

const cta: React.CSSProperties = {
  display: 'block',
  textAlign: 'center',
  background: '#0d4f6e',
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 700,
  borderRadius: 12,
  padding: '14px 16px',
};
