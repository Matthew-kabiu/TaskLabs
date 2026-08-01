import type { MetadataRoute } from 'next';
import { absoluteUrl, siteOrigin } from '@/lib/site';
import { DOC_NAV } from '@/lib/docs';

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteOrigin()) return [];
  const lastModified = new Date();

  return [
    {
      url: absoluteUrl('/'),
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
    ...DOC_NAV.map(
      (doc) =>
        ({
          url: absoluteUrl(doc.slug),
          lastModified,
          changeFrequency: 'monthly' as const,
          priority: 0.7,
        }) as const,
    ),
  ];
}
