export const memoryRedis = () => {
  const entries = new Map<string, string>();
  const writes: { key: string; ttl: number; value: string }[] = [];
  let readFailure: Error | null = null;
  let writeFailure: Error | null = null;

  return {
    entries,
    failReads: (error: Error) => {
      readFailure = error;
    },
    failWrites: (error: Error) => {
      writeFailure = error;
    },
    get: async (key: string) => {
      if (readFailure) {
        throw readFailure;
      }

      return entries.get(key) ?? null;
    },
    set: async (key: string, value: string, ttl: number) => {
      if (writeFailure) {
        throw writeFailure;
      }

      entries.set(key, value);
      writes.push({ key, ttl, value });
    },
    writes,
  };
};
