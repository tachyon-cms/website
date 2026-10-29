import { getCollection } from 'astro:content';
import { isPublished } from './published.js';

/** Posts whose day has come, newest first. Every list of posts reads from here. */
export const publishedPosts = async () =>
  (await getCollection('blog', (p) => isPublished(p))).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf() || a.id.localeCompare(b.id),
  );

export const postDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
