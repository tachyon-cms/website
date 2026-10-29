import rss from '@astrojs/rss';
import { publishedPosts } from '../lib/posts';

export async function GET(context) {
  return rss({
    title: 'TachyonCMS',
    description: 'Releases and notes from building TachyonCMS in public.',
    site: context.site,
    trailingSlash: false,
    items: (await publishedPosts()).map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/blog/${p.id}`,
    })),
  });
}
