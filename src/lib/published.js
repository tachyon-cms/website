// A post is live from its date on. One dated later is left out of every build
// until that day; the daily rebuild publishes it.
/** @param {{ data: { date: Date } }} post */
export const isPublished = (post, now = new Date()) => post.data.date <= now;
