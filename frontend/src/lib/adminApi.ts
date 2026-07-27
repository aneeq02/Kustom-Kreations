const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const ADMIN_PIN_KEY = 'kk_admin_pin';

export function getAdminPin(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(ADMIN_PIN_KEY) ?? '';
}

export function saveAdminPin(pin: string) {
  sessionStorage.setItem(ADMIN_PIN_KEY, pin);
}

export function clearAdminPin() {
  sessionStorage.removeItem(ADMIN_PIN_KEY);
}

export async function adminFetch(
  path: string,
  options: RequestInit = {},
  pin?: string,
): Promise<Response> {
  const resolvedPin = pin ?? getAdminPin();
  return fetch(`${API_BASE}/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Pin': resolvedPin,
      ...(options.headers ?? {}),
    },
  });
}

export async function adminGet<T>(path: string): Promise<T> {
  const res = await adminFetch(path);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function adminPost<T>(path: string, body: unknown): Promise<T> {
  const res = await adminFetch(path, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await adminFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function adminDelete(path: string): Promise<void> {
  const res = await adminFetch(path, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}
