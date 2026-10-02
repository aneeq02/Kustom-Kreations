'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import CookieBanner from './CookieBanner';
import dynamic from 'next/dynamic';

// The bag (and PayPal, inside its checkout step) loads after the page, not with it
const BagDrawer = dynamic(() => import('@/components/bag/BagDrawer'), { ssr: false });

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  // The studio is a full-screen app with its own top bar (Mixtiles-style)
  const isStudio = pathname?.startsWith('/configure');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      {!isStudio && <Navbar />}
      <main className="flex-1">{children}</main>
      {!isStudio && <Footer />}
      <BagDrawer />
      <CookieBanner />
    </>
  );
}
