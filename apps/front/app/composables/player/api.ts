import type { Tournament } from "~/types/tournament";
import type { PlayerProfileAward, ProfileMatchListItem } from "@sarpbc/types";

export async function getPlayerMatches(playerId: string): Promise<ProfileMatchListItem[]> {
  const res = await $fetch<{ matches?: ProfileMatchListItem[] }>(
    `${useApiBase()}/player/${playerId}/matches`,
    {
      method: "GET",
      credentials: "include",
      headers: useInternalApiHeaders(),
    },
  );

  return res.matches ?? [];
}

export async function getPlayerTrophies(playerId: string): Promise<Tournament[]> {
  const res = await $fetch<{ trophies?: Tournament[] }>(
    `${useApiBase()}/player/${playerId}/trophies`,
    {
      method: "GET",
      credentials: "include",
      headers: useInternalApiHeaders(),
    },
  );

  return res.trophies ?? [];
}

export async function getPlayerAwards(playerId: string): Promise<PlayerProfileAward[]> {
  const res = await $fetch<{ awards?: PlayerProfileAward[] }>(
    `${useApiBase()}/player/${playerId}/awards`,
    {
      method: "GET",
      credentials: "include",
      headers: useInternalApiHeaders(),
    },
  );

  return res.awards ?? [];
}

export async function getPlayerTournaments(playerId: string): Promise<Tournament[]> {
  const res = await $fetch<{ tournaments?: Tournament[] }>(
    `${useApiBase()}/player/${playerId}/tournaments`,
    {
      method: "GET",
      credentials: "include",
      headers: useInternalApiHeaders(),
    },
  );

  return res.tournaments ?? [];
}
