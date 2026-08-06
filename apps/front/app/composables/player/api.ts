import type { Match } from "~/types/matches";

/** Throws on failure so match sections can render their own error state. */
export async function getPlayerMatches(playerId: string): Promise<Match[]> {
  const config = useRuntimeConfig();
  const res = await $fetch<{ matches?: Match[] }>(
    `${config.public.apiBase}/player/${playerId}/matches`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  return res.matches ?? [];
}
