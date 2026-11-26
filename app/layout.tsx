import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'ETATIX — Discover. Book. Experience.',
  description: 'Temukan event, beli tiket, dan kelola acara bersama ETATIX.',
  icons: { icon: '/logo.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><SiteHeader />{children}</body></html>;
}
