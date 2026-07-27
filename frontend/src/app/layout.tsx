import type { Metadata } from 'next';
import { Fraunces, DM_Sans } from 'next/font/google';
import './globals.css';
import SiteShell from '@/components/layout/SiteShell';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  axes: ['opsz', 'SOFT', 'WONK'],
  display: 'swap',
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Kustom Kreations — Personalised Photo Magnets',
    template: '%s | Kustom Kreations',
  },
  description: 'Create beautiful personalised 50mm photo magnets from your favourite memories. Upload, preview, and order in minutes. Ships to UK, Isle of Man & Ireland.',
  keywords: ['photo magnets', 'personalised magnets', 'custom magnets', 'photo gifts', 'fridge magnets'],
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: 'Kustom Kreations',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-cream text-navy antialiased">
        <AuthProvider>
          <CartProvider>
            <SiteShell>{children}</SiteShell>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
