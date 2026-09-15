'use client';

import { useParams } from 'next/navigation';
import { ContentTabs } from '../../../components/ContentTabs';

export default function ContentFeedPage() {
  const params = useParams();
  const type = String(params.type ?? 'article');

  return (
    <main className="phone-frame ig-content-pad" style={{ background: '#fff', minHeight: '70vh', padding: '8px 16px 32px' }}>
      <h1 style={{ margin: '8px 0 4px', fontSize: '1.15rem' }}>Content</h1>
      <ContentTabs initial={type} />
    </main>
  );
}
