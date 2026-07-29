const cache = new Map<string, Promise<unknown>>();

export function fetchWithEntityTagCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = cache.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const pending = fetcher().catch((error: unknown) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, pending);
  return pending;
}
