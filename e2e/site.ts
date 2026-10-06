// The site under test: the local preview by default, or a deployed copy with BASE_URL=https://oscar-chw.github.io.
export const BASE = process.env.BASE_URL ?? "http://localhost:4321";
const SELF = new URL(BASE).hostname;
/** For page.route: true for any request that leaves the site under test. */
export const offsite = (u: URL) => u.hostname !== SELF;
