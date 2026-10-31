export interface SourceStream {
  login: string;
  displayName: string;
  title: string;
  viewerCount: number;
}

export interface LiveStreamSource {
  findLiveRocketLeague(logins: readonly string[]): Promise<SourceStream[]>;
}
