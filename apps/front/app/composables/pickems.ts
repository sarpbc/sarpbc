import { getAllTournaments } from "~/composables/tournaments";
import { isPickemTournamentActive } from "~/utils/pickems";
import type { TournamentListItem } from "@sarpbc/types";
import { getApiErrorMessage, isNonEmptyString } from "@sarpbc/utils";

export interface UserPickemPick {
  match: string;
  pickedParticipant: string;
  points: number | null;
  scored: boolean;
}

export interface PickemLeaderboardEntry {
  userId: string;
  userName: string;
  points: number;
}

export interface PickemPersonalRanking {
  rank: number | null;
  total: number;
  points: number;
}

export const getActivePickemTournaments = async (limit = 1): Promise<TournamentListItem[]> => {
  const { tournaments } = await getAllTournaments({
    limit: Math.max(limit, 1),
    pickems: true,
    activeOnly: true,
  });

  return tournaments.filter(isPickemTournamentActive).slice(0, limit);
};

export const getUserPickemsForTournament = async (
  tournamentId: string,
): Promise<UserPickemPick[]> => {
  const res = await apiFetch<{
    picks?: UserPickemPick[];
  }>(`/pickem/tournament/${tournamentId}/user/picks`, {
    method: "GET",
  });

  return (res.picks ?? []).map((pick) => ({
    match: pick.match,
    pickedParticipant: pick.pickedParticipant,
    points: pick.points ?? null,
    scored: pick.scored,
  }));
};

export const updatePickemForMatch = async (
  matchId: string,
  pickedParticipantId: string,
): Promise<void> => {
  const res = await apiFetch<{ success?: boolean; error?: string }>(
    `/pickem/match/${matchId}/pick`,
    {
      method: "POST",
      body: {
        pickedParticipantId,
      },
    },
  );

  if (res.success === false) {
    throw new Error(isNonEmptyString(res.error) ? res.error : "Pick failed");
  }
};

export const getPickemLeaderboard = async (
  tournamentId: string,
): Promise<PickemLeaderboardEntry[]> => {
  const res = await apiFetch<{ leaderboard?: PickemLeaderboardEntry[] }>(
    `/pickem/tournament/${tournamentId}/leaderboard`,
    {
      method: "GET",
    },
  );

  return res.leaderboard ?? [];
};

export const getPickemPersonalRanking = async (
  tournamentId: string,
): Promise<PickemPersonalRanking> =>
  await apiFetch<PickemPersonalRanking>(`/pickem/tournament/${tournamentId}/me`, {
    method: "GET",
  });

export const pickemApiErrorMessage = (cause: unknown, fallback: string): string =>
  getApiErrorMessage(cause) ?? fallback;
