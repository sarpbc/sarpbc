export function matchPath(publicId: number, slug: string): string {
  return `/matches/${publicId}/${slug}`;
}

export function forumPostPath(publicId: number, slug: string): string {
  return `/forum/post/${publicId}/${slug}`;
}

export function tournamentEventPath(eventSlug: string): string {
  return `/tournaments/${eventSlug}`;
}

export function tournamentStagePath(eventSlug: string, stageSlug: string): string {
  return `/tournaments/${eventSlug}/${stageSlug}`;
}
