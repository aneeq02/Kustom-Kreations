// FRONTEND_URL is a comma-separated list of allowed origins (used for CORS),
// e.g. "http://localhost:3000,https://kustomkreations.online". Links we put in
// emails must point at the live site, so use the first https:// entry.
export function publicSiteUrl(): string {
  const origins = (process.env.FRONTEND_URL || '').split(',').map(o => o.trim()).filter(Boolean);
  const live = origins.find(o => o.startsWith('https://')) ?? origins[0] ?? 'https://kustomkreations.online';
  return live.replace(/\/$/, '');
}
