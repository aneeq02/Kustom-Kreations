// Sends a sample order-confirmation email so you can check SMTP is set up.
// Usage: npm run email:test -- you@example.com
import 'dotenv/config';
import { verifyEmailConfig, sendOrderConfirmation } from '../services/email';

(async () => {
  const to = process.argv[2];
  if (!to) { console.error('Usage: npm run email:test -- you@example.com'); process.exit(1); }
  try {
    console.log(`Connecting to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 465} as ${process.env.SMTP_USER}…`);
    await verifyEmailConfig();
    console.log('✓ SMTP login OK — sending a sample order confirmation…');
    await sendOrderConfirmation({
      id: 'test', orderNumber: 'KK-TEST-0001', email: to, firstName: 'Test', currency: 'GBP', total: '8.50',
      items: [{ name: 'Photo Magnet (50mm)', qty: 2, price: '4.20' }, { name: '2x2 Photo Magnet Set (50mm)', qty: 1, price: '8.40' }],
    });
    console.log(`✓ Sent to ${to} — check the inbox (and spam folder).`);
    process.exit(0);
  } catch (err: any) {
    console.error('✗ Email failed:', err?.message ?? err);
    process.exit(1);
  }
})();
