import type { Match } from "~/types/matches";
import type { Tournament } from "~/types/tournament";
import type { PlayerAwardListItem } from "@sarpbc/types";

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

/** Throws on failure so trophy section can render its own error state. */
export async function getPlayerTrophies(playerId: string): Promise<Tournament[]> {
  const config = useRuntimeConfig();
  const res = await $fetch<{ trophies?: Tournament[] }>(
    `${config.public.apiBase}/player/${playerId}/trophies`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  return res.trophies ?? [];
}

/** Throws on failure so awards section can render its own error state. */
export async function getPlayerAwards(playerId: string): Promise<PlayerAwardListItem[]> {
  const config = useRuntimeConfig();
  const res = await $fetch<{ awards?: PlayerAwardListItem[] }>(
    `${config.public.apiBase}/player/${playerId}/awards`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  return res.awards ?? [];
}
