import type { LiveStreamSource, SourceStream } from "./live-stream-source";

export class MemoryLiveStreamSource implements LiveStreamSource {
  streams: SourceStream[];
  failure: Error | null = null;
  readonly requests: (readonly string[])[] = [];

  constructor(streams: SourceStream[]) {
    this.streams = streams;
  }

  async findLiveRocketLeague(logins: readonly string[]) {
    this.requests.push(logins);

    if (this.failure) {
      throw this.failure;
    }

    return await Promise.resolve(this.streams);
  }
}
