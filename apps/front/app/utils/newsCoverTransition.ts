export function newsCoverTransitionName(slug: string): string {
  const safe = slug.replaceAll(/[^a-zA-Z0-9_-]/g, "-");

  return `news-cover-${safe}`;
}
