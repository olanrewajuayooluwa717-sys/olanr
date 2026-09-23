import { Shell } from '../components/Shell';
import './device.css';

export const metadata = {
  title: 'Fishmaster',
  description: 'Fishmaster Limited — aquaculture management for catfish farmers',
  icons: {
    icon: '/brand/logo-compact.png',
    apple: '/brand/logo-compact.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
