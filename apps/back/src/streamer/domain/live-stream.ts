export interface LiveStream {
  login: string;
  displayName: string;
  title: string;
  viewerCount: number;
  url: string;
}

export function byViewerCount(streams: readonly LiveStream[]): LiveStream[] {
  return [...streams].sort((a, b) => b.viewerCount - a.viewerCount);
}
