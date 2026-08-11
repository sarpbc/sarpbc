import { getAllTournaments } from "~/composables/tournaments";
import { isPickemTournamentActive } from "~/utils/pickems";
import type { Tournament } from "~/types/tournament";
import { getApiErrorMessage } from "~/utils/apiError";

export type UserPickemPick = {
  match: string;
  pickedParticipant: string;
  points: number | null;
  scored: boolean;
};

export type PickemLeaderboardEntry = {
  userId: string;
  userName: string;
  points: number;
};

export type PickemPersonalRanking = {
  rank: number | null;
  total: number;
  points: number;
};

export async function getActivePickemTournaments(limit = 1): Promise<Tournament[]> {
  const { tournaments } = await getAllTournaments({
    limit: Math.max(limit, 1),
    pickems: true,
    activeOnly: true,
  });
  return tournaments.filter(isPickemTournamentActive).slice(0, limit);
}

export async function getUserPickemsForTournament(tournamentId: string): Promise<UserPickemPick[]> {
  const config = useRuntimeConfig();
  const res = await $fetch<{
    picks?: UserPickemPick[];
  }>(`${config.public.apiBase}/pickem/tournament/${tournamentId}/user/picks`, {
    method: "GET",
    credentials: "include",
  });

  return (res.picks ?? []).map((pick) => ({
    match: pick.match,
    pickedParticipant: pick.pickedParticipant,
    points: pick.points ?? null,
    scored: Boolean(pick.scored),
  }));
}

export async function updatePickemForMatch(
  matchId: string,
  pickedParticipantId: string,
): Promise<void> {
  const config = useRuntimeConfig();
  const res = await $fetch<{ success?: boolean; error?: string }>(
    `${config.public.apiBase}/pickem/match/${matchId}/pick`,
    {
      method: "POST",
      credentials: "include",
      body: {
        pickedParticipantId,
      },
    },
  );

  if (res && res.success === false) {
    throw new Error(res.error || "Pick failed");
  }
}

export async function getPickemLeaderboard(
  tournamentId: string,
): Promise<PickemLeaderboardEntry[]> {
  const config = useRuntimeConfig();
  const res = await $fetch<{ leaderboard?: PickemLeaderboardEntry[] }>(
    `${config.public.apiBase}/pickem/tournament/${tournamentId}/leaderboard`,
    {
      method: "GET",
      credentials: "include",
    },
  );
  return res.leaderboard ?? [];
}

export async function getPickemPersonalRanking(
  tournamentId: string,
): Promise<PickemPersonalRanking> {
  const config = useRuntimeConfig();
  return await $fetch<PickemPersonalRanking>(
    `${config.public.apiBase}/pickem/tournament/${tournamentId}/me`,
    {
      method: "GET",
      credentials: "include",
    },
  );
}

export function pickemApiErrorMessage(error: unknown, fallback: string): string {
  return getApiErrorMessage(error) ?? fallback;
}
