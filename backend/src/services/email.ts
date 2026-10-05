import nodemailer from 'nodemailer';
import { publicSiteUrl } from '../utils/siteUrl';

// ── Transport ─────────────────────────────────────────────────────────────────
// Hostinger mail: SMTP_HOST=smtp.hostinger.com, SMTP_PORT=465 (SSL).
// Port 465 needs an SSL connection from the start; 587 upgrades with STARTTLS.
const port = Number(process.env.SMTP_PORT) || 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const SITE = publicSiteUrl();
// Must be the same mailbox as SMTP_USER (or an alias of it) — Hostinger rejects
// mail "from" an address the login doesn't own.
const FROM = process.env.EMAIL_FROM || `Kustom Kreations <${process.env.SMTP_USER ?? 'orders@kustomkreations.online'}>`;

export const emailConfigured = () =>
  !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

/** Checks the SMTP login works — used by `npm run email:test`. */
export async function verifyEmailConfig() {
  if (!emailConfigured()) throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASS must all be set in backend/.env');
  await transporter.verify();
}

// ── Shared layout (brand green, matches the site) ─────────────────────────────
const BRAND = '#006E71';
const INK = '#1A1A18';
const MUTED = '#8C8880';
const CREAM = '#F7F6F2';

const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const money = (currency: string, amount: string) =>
  `${currency === 'GBP' ? '£' : `${currency} `}${amount}`;

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:${BRAND};color:#ffffff;padding:13px 26px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${label}</a>`;

function layout(title: string, body: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${CREAM};">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
    <div style="text-align:center;padding:8px 0 20px;">
      <img src="${SITE}/logo-teal.png" alt="Kustom Kreations" width="56" height="56" style="display:inline-block;" />
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${BRAND};margin-top:6px;">kustom kreations</div>
    </div>
    <div style="background:#ffffff;border:1px solid #E0DDD6;border-radius:12px;padding:28px 24px;">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:28px;line-height:1.2;margin:0 0 16px;color:${INK};">${title}</h1>
      ${body}
    </div>
    <p style="text-align:center;color:${MUTED};font-size:12px;margin:20px 0 0;">
      Kustom Kreations · Personalised photo magnets · <a href="${SITE}" style="color:${MUTED};">kustomkreations.online</a>
    </p>
  </div>
</body></html>`;
}

// ── Emails ────────────────────────────────────────────────────────────────────

export async function sendOrderConfirmation(order: {
  id: string;
  orderNumber: string;
  email: string;
  firstName: string;
  total: string;
  currency: string;
  items: Array<{ name: string; qty: number; price: string; imageUrl?: string }>;
}) {
  const rows = order.items
    .map(i => `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #EFEDE8;">${esc(i.name)} <span style="color:${MUTED};">× ${i.qty}</span></td>
      <td style="padding:10px 0;border-bottom:1px solid #EFEDE8;text-align:right;white-space:nowrap;">${money(order.currency, esc(i.price))}</td>
    </tr>`)
    .join('');
  const trackUrl = `${SITE}/track/${encodeURIComponent(order.orderNumber)}`;

  await transporter.sendMail({
    from: FROM,
    to: order.email,
    subject: `Order confirmed — ${order.orderNumber}`,
    text: [
      `Hi ${order.firstName},`,
      `Thanks for your order! We've received it and will start making your magnets soon.`,
      `Order number: ${order.orderNumber}`,
      ...order.items.map(i => `- ${i.name} x ${i.qty}: ${money(order.currency, i.price)}`),
      `Total paid: ${money(order.currency, order.total)}`,
      `Track your order: ${trackUrl}`,
    ].join('\n'),
    html: layout('Thank you for your order', `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hi ${esc(order.firstName)},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">We've received your order and will start making your personalised magnets soon. We'll email you again when they're on their way.</p>
      <p style="margin:0 0 4px;font-size:13px;color:${MUTED};text-transform:uppercase;letter-spacing:.08em;">Order number</p>
      <p style="margin:0 0 20px;font-size:18px;font-weight:600;">${esc(order.orderNumber)}</p>
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px;margin:0 0 8px;">
        ${rows}
        <tr>
          <td style="padding:14px 0 0;font-weight:600;">Total paid</td>
          <td style="padding:14px 0 0;text-align:right;font-weight:600;">${money(order.currency, esc(order.total))}</td>
        </tr>
      </table>
      <div style="margin:24px 0 8px;">${button(trackUrl, 'Track your order')}</div>
      <p style="color:${MUTED};font-size:13px;line-height:1.6;margin:20px 0 0;">Questions? Just reply to this email or visit <a href="${SITE}/contact" style="color:${BRAND};">our help page</a>.</p>
    `),
  });
}

export async function sendAbandonedCartEmail(data: {
  email: string;
  firstName: string;
  cartUrl: string;
}) {
  await transporter.sendMail({
    from: FROM,
    to: data.email,
    subject: 'Your magnets are waiting',
    text: `Hi ${data.firstName || 'there'},\nYou left some photos in your basket — your personalised magnets are waiting to be made.\nFinish your order: ${data.cartUrl}`,
    html: layout('Still thinking about your magnets?', `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hi ${esc(data.firstName || 'there')},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">You left some photos in your basket — your personalised magnets are waiting to be made.</p>
      ${button(data.cartUrl, 'Finish your order')}
    `),
  });
}

export async function sendPasswordReset(email: string, resetUrl: string) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your Kustom Kreations password',
    text: `Reset your password (link expires in 1 hour): ${resetUrl}\nIf you didn't request this, you can ignore this email.`,
    html: layout('Reset your password', `
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Click below to choose a new password. This link expires in 1 hour.</p>
      ${button(resetUrl, 'Reset password')}
      <p style="color:${MUTED};font-size:13px;margin:24px 0 0;">If you didn't request this, you can safely ignore this email.</p>
    `),
  });
}
