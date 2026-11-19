import type { LiveStreamCache, LiveStreamSnapshot } from "./live-stream-cache";

const CLAIM = "claim-1";

export class MemoryLiveStreamCache implements LiveStreamCache {
  snapshot: LiveStreamSnapshot | null = null;
  refreshClaimable = true;
  readFailure: Error | null = null;
  writeFailure: Error | null = null;

  async read() {
    if (this.readFailure) {
      throw this.readFailure;
    }

    return await Promise.resolve(this.snapshot);
  }

  async claimRefresh() {
    return await Promise.resolve(this.refreshClaimable ? CLAIM : null);
  }

  async write(snapshot: LiveStreamSnapshot, claim: string) {
    if (this.writeFailure) {
      throw this.writeFailure;
    }

    if (claim !== CLAIM) {
      return await Promise.resolve(false);
    }

    this.snapshot = snapshot;

    return await Promise.resolve(true);
  }

  async clear() {
    this.snapshot = null;

    await Promise.resolve();
  }
}
