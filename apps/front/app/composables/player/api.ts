import type { Match } from "~/types/matches";
import type { Tournament } from "~/types/tournament";
import type { PlayerProfileAward } from "@sarpbc/types";

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

export async function getPlayerAwards(playerId: string): Promise<PlayerProfileAward[]> {
  const config = useRuntimeConfig();
  const res = await $fetch<{ awards?: PlayerProfileAward[] }>(
    `${config.public.apiBase}/player/${playerId}/awards`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  return res.awards ?? [];
}

export async function getPlayerTournaments(playerId: string): Promise<Tournament[]> {
  const config = useRuntimeConfig();
  const res = await $fetch<{ tournaments?: Tournament[] }>(
    `${config.public.apiBase}/player/${playerId}/tournaments`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  return res.tournaments ?? [];
}
