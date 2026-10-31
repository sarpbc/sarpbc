import type { Tournament } from "~/types/tournament";
import type { PlayerProfileAward, ProfileEarnings, ProfileMatchListItem } from "@sarpbc/types";
import { apiFetch } from "~/utils/apiFetch";

export async function getPlayerMatches(playerId: string): Promise<ProfileMatchListItem[]> {
  const res = await apiFetch<{ matches?: ProfileMatchListItem[] }>(`/player/${playerId}/matches`, {
    method: "GET",
  });

  return res.matches ?? [];
}

export async function getPlayerTrophies(playerId: string): Promise<Tournament[]> {
  const res = await apiFetch<{ trophies?: Tournament[] }>(`/player/${playerId}/trophies`, {
    method: "GET",
  });

  return res.trophies ?? [];
}

export async function getPlayerAwards(playerId: string): Promise<PlayerProfileAward[]> {
  const res = await apiFetch<{ awards?: PlayerProfileAward[] }>(`/player/${playerId}/awards`, {
    method: "GET",
  });

  return res.awards ?? [];
}

export async function getPlayerEarnings(playerId: string): Promise<ProfileEarnings> {
  const res = await apiFetch<{ earnings: ProfileEarnings }>(`/player/${playerId}/earnings`, {
    method: "GET",
  });

  return res.earnings;
}

export async function getPlayerTournaments(playerId: string): Promise<Tournament[]> {
  const res = await apiFetch<{ tournaments?: Tournament[] }>(`/player/${playerId}/tournaments`, {
    method: "GET",
  });

  return res.tournaments ?? [];
}
