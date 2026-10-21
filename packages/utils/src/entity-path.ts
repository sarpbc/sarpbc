export function matchPath(publicId: number, slug: string): string {
  return `/matches/${publicId}/${slug}`;
}

export function forumPostPath(publicId: number, slug: string): string {
  return `/forum/post/${publicId}/${slug}`;
}
