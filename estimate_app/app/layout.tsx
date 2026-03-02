import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Calvora Verliescheck',
  description: 'Ontdek in 3 minuten wat je als timmerman laat liggen per maand en per jaar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
