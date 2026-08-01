import type { MetadataRoute } from 'next';
import { siteOrigin, absoluteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/app/',
        '/tasks',
        '/calendar',
        '/notifications',
        '/settings/',
        '/login',
        '/register',
        '/setup',
        '/invite/',
        '/api/',
      ],
    },
    sitemap: origin ? absoluteUrl('/sitemap.xml') : undefined,
  };
}
