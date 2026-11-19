import { getAllTournaments } from "~/composables/tournaments";
import { isPickemTournamentActive } from "~/utils/pickems";
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

export const getActivePickemTournaments = async (limit = 1) => {
  const { tournaments } = await getAllTournaments({
    activeOnly: true,
    limit: Math.max(limit, 1),
    pickems: true,
  });

  return tournaments.filter(isPickemTournamentActive).slice(0, limit);
};

export const getUserPickemsForTournament = async (tournamentId: string) => {
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

export const updatePickemForMatch = async (matchId: string, pickedParticipantId: string) => {
  const res = await apiFetch<{ success?: boolean; error?: string }>(
    `/pickem/match/${matchId}/pick`,
    {
      body: {
        pickedParticipantId,
      },
      method: "POST",
    },
  );

  if (res.success === false) {
    throw new Error(isNonEmptyString(res.error) ? res.error : "Pick failed");
  }
};

export const getPickemLeaderboard = async (tournamentId: string) => {
  const res = await apiFetch<{ leaderboard?: PickemLeaderboardEntry[] }>(
    `/pickem/tournament/${tournamentId}/leaderboard`,
    {
      method: "GET",
    },
  );

  return res.leaderboard ?? [];
};

export const getPickemPersonalRanking = async (tournamentId: string) =>
  await apiFetch<PickemPersonalRanking>(`/pickem/tournament/${tournamentId}/me`, {
    method: "GET",
  });

export const pickemApiErrorMessage = (cause: unknown, fallback: string) =>
  getApiErrorMessage(cause) ?? fallback;
