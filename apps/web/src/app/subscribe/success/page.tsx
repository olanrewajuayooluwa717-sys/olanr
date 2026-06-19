'use client';

import Link from 'next/link';
import { Card, btnStyle } from '../../components/Shell';

export default function SubscribeSuccessPage() {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <Card title="Subscription active">
        <p>Thank you! Your payment was successful and your account is now active.</p>
        <Link href="/" style={{ ...btnStyle, display: 'inline-block', textDecoration: 'none', marginTop: '1rem' }}>
          Go to dashboard
        </Link>
      </Card>
    </main>
  );
}
