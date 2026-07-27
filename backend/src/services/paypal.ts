/**
 * PayPal REST API v2 service.
 * Reads PAYPAL_ENV to switch between sandbox and live.
 *
 * .env (dev):
 *   PAYPAL_ENV=sandbox
 *   PAYPAL_CLIENT_ID_SANDBOX=<from developer.paypal.com>
 *   PAYPAL_SECRET_SANDBOX=<from developer.paypal.com>
 *
 * .env.production (live):
 *   PAYPAL_ENV=live
 *   PAYPAL_CLIENT_ID_LIVE=<your live client id>
 *   PAYPAL_SECRET_LIVE=<your live secret>
 */

const IS_LIVE = process.env.PAYPAL_ENV === 'live';

export const PAYPAL_ENV = IS_LIVE ? 'live' : 'sandbox';

const PAYPAL_BASE = IS_LIVE
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = IS_LIVE
  ? process.env.PAYPAL_CLIENT_ID_LIVE!
  : process.env.PAYPAL_CLIENT_ID_SANDBOX!;

const SECRET = IS_LIVE
  ? process.env.PAYPAL_SECRET_LIVE!
  : process.env.PAYPAL_SECRET_SANDBOX!;

// Cache the access token so we don't re-auth on every request
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayPal auth failed (${res.status}): ${body}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    value:     data.access_token,
    // Subtract 60 s so we refresh before the token actually expires
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

/** Create a PayPal order (intent=CAPTURE) and return its ID. */
export async function createPayPalOrder(
  amount: string,
  currency: string,
  internalRef: string,
): Promise<string> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': internalRef, // idempotency key
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: internalRef,
        description:  'Kustom Kreations — Photo Magnets',
        amount: {
          currency_code: currency.toUpperCase(),
          value: amount,
        },
      }],
      application_context: {
        brand_name:          'Kustom Kreations',
        shipping_preference: 'NO_SHIPPING', // we already have the address
        user_action:         'PAY_NOW',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json() as { message?: string };
    throw new Error(err.message ?? `PayPal create-order failed (${res.status})`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

/** Capture an approved PayPal order. Returns the full capture response. */
export async function capturePayPalOrder(paypalOrderId: string): Promise<{
  id: string;
  status: string;
  payer: { email_address: string; payer_id: string };
  purchase_units: Array<{
    payments: {
      captures: Array<{ id: string; status: string; amount: { value: string; currency_code: string } }>;
    };
  }>;
}> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json() as { message?: string };
    throw new Error(err.message ?? `PayPal capture failed (${res.status})`);
  }

  return res.json() as any;
}
