export function newsCoverTransitionName(slug: string): string {
  const safe = slug.replaceAll(/[^a-zA-Z0-9_-]/gu, "-");

  return `news-cover-${safe}`;
}
