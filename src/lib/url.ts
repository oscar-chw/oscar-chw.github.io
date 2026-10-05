// Internal links go through here so the /next/ preview build and the root build both resolve.
export const url = (path: string) => import.meta.env.BASE_URL.replace(/\/$/, "") + path;
