import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-navy text-white mt-16">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Image src="/logo-teal.png" alt="Kustom Kreations" width={40} height={40} className="w-10 h-10" />
            <span className="font-heading font-bold text-lg">kustom kreations</span>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            Personalised 50mm photo magnets, shipped with love to UK & Isle of Man.
          </p>
        </div>

        <div>
          <h3 className="font-heading font-bold mb-3">Shop</h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link href="/configure" className="hover:text-coral transition-colors">Make Magnets</Link></li>
            <li><Link href="/cart" className="hover:text-coral transition-colors">Your Cart</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-heading font-bold mb-3">Help</h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link href="/faq" className="hover:text-coral transition-colors">FAQ</Link></li>
            <li><Link href="/shipping" className="hover:text-coral transition-colors">Shipping & Returns</Link></li>
            <li><Link href="/contact" className="hover:text-coral transition-colors">Contact Us</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-heading font-bold mb-3">Legal</h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link href="/privacy" className="hover:text-coral transition-colors">Privacy Policy</Link></li>
            <li><Link href="/privacy#cookies" className="hover:text-coral transition-colors">Cookie Policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/40">
        <p>&copy; {new Date().getFullYear()} Kustom Kreations. All rights reserved.</p>
        <p>Secure &amp; encrypted checkout</p>
      </div>
    </footer>
  );
}
