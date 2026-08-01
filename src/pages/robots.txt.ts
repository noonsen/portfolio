import type { APIRoute } from 'astro';
import { hasSiteUrl, siteUrl } from '../../site.config.mjs';

export const GET: APIRoute = () => {
  const lines = ['User-agent: *', 'Allow: /'];

  if (hasSiteUrl) {
    const basePath = import.meta.env.BASE_URL.replace(/\/+$/, '');
    // Direct string concatenation (siteUrl has no trailing slash): preserves any path segment already in SITE_URL,
    // which new URL's root-absolute resolution would otherwise strip.
    lines.push(`Sitemap: ${siteUrl}${basePath}/sitemap-index.xml`);
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
};
