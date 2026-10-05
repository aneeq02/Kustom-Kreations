// The one public address of the site. Everything Google sees (sitemap,
// robots, metadata) uses this, and www.* is permanently redirected to it so
// search engines don't treat the two as separate sites.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://kustomkreations.online').replace(/\/$/, '');
