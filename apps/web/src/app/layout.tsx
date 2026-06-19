import { Shell } from '../components/Shell';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
