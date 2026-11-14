import type { Player, Team } from "@sarpbc/types";

const createEntityTagCache = <T>() => {
  const cache = new Map<string, Promise<T>>();

  return async (slug: string, fetcher: () => Promise<T>): Promise<T> => {
    const existing = cache.get(slug);

    if (existing !== undefined) {
      return await existing;
    }

    const pending = fetcher();
    cache.set(slug, pending);

    try {
      return await pending;
    } catch (error) {
      cache.delete(slug);
      throw error;
    }
  };
};

export const fetchPlayerTagWithCache = createEntityTagCache<{ player: Player | null }>();
export const fetchTeamTagWithCache = createEntityTagCache<{ team: Team | null }>();
