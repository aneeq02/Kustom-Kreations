import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || 'Kustom Kreations <noreply@kustomkreations.co.uk>';
const BASE = process.env.FRONTEND_URL || 'https://kustomkreations.co.uk';

export async function sendOrderConfirmation(order: {
  id: string;
  orderNumber: string;
  email: string;
  firstName: string;
  total: string;
  currency: string;
  items: Array<{ name: string; qty: number; price: string; imageUrl?: string }>;
}) {
  const itemRows = order.items
    .map(i => `<tr>
      <td style="padding:8px 0;">${i.name} × ${i.qty}</td>
      <td style="padding:8px 0;text-align:right;">${order.currency} ${i.price}</td>
    </tr>`)
    .join('');

  await transporter.sendMail({
    from: FROM,
    to: order.email,
    subject: `Your Kustom Kreations order is confirmed! 🧲 ${order.orderNumber}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#2E2B4E;">
        <div style="background:#F2967B;padding:24px;border-radius:16px 16px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Order Confirmed!</h1>
        </div>
        <div style="padding:32px;background:#FAF6EE;border-radius:0 0 16px 16px;">
          <p>Hi ${order.firstName},</p>
          <p>Woohoo! Your personalised magnets are on their way to being made. 🎉</p>
          <p><strong>Order number:</strong> ${order.orderNumber}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            ${itemRows}
            <tr style="border-top:2px solid #F2967B;">
              <td style="padding:8px 0;font-weight:bold;">Total</td>
              <td style="padding:8px 0;text-align:right;font-weight:bold;">${order.currency} ${order.total}</td>
            </tr>
          </table>
          <a href="${BASE}/track/${order.id}" style="display:inline-block;background:#F2967B;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">Track your order</a>
          <p style="color:#7A786E;font-size:13px;margin-top:24px;">Questions? Reply to this email or visit our <a href="${BASE}/contact" style="color:#F2967B;">help centre</a>.</p>
        </div>
      </div>
    `,
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
    subject: 'You left something behind! 🧲',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#2E2B4E;">
        <div style="padding:32px;background:#FAF6EE;border-radius:16px;">
          <h2 style="color:#F2967B;">Still thinking about your magnets?</h2>
          <p>Hi ${data.firstName || 'there'},</p>
          <p>You left some photos in your cart — your personalised magnets are waiting to be made!</p>
          <a href="${data.cartUrl}" style="display:inline-block;background:#F2967B;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">Complete your order</a>
        </div>
      </div>
    `,
  });
}

export async function sendPasswordReset(email: string, resetUrl: string) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your Kustom Kreations password',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#2E2B4E;padding:32px;">
        <h2>Reset your password</h2>
        <p>Click below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#F2967B;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">Reset password</a>
        <p style="color:#7A786E;font-size:13px;">If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}
