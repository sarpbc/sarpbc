export class MemoryRedis {
  readonly values = new Map<string, string>();
  readonly ttls = new Map<string, number>();

  async get(key: string) {
    return await Promise.resolve(this.values.get(key) ?? null);
  }

  async setIfAbsent(key: string, value: string, ttlInSeconds: number) {
    if (this.values.has(key)) {
      return await Promise.resolve(false);
    }

    this.values.set(key, value);
    this.ttls.set(key, ttlInSeconds);

    return await Promise.resolve(true);
  }

  async setWhileHeld(
    lockKey: string,
    lockValue: string,
    key: string,
    value: string,
    ttlInSeconds: number,
  ) {
    if (this.values.get(lockKey) !== lockValue) {
      return await Promise.resolve(false);
    }

    this.values.set(key, value);
    this.ttls.set(key, ttlInSeconds);

    return await Promise.resolve(true);
  }

  async delete(key: string) {
    this.ttls.delete(key);

    return await Promise.resolve(this.values.delete(key) ? 1 : 0);
  }
}
