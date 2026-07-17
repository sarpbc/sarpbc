import { getAllTournaments } from "~/composables/tournaments";
import { isPickemTournamentActive } from "~/utils/pickems";
import type { Tournament } from "~/types/tournament";

export async function getActivePickemTournaments(limit = 1): Promise<Tournament[]> {
  const tournaments = await getAllTournaments({
    limit: Math.max(limit, 1),
    pickems: true,
    activeOnly: true,
  });
  return tournaments.filter(isPickemTournamentActive).slice(0, limit);
}

export async function getUserPickemsForTournament(
  tournamentId: string,
): Promise<{ match: string; pickedParticipant: string }[]> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{
      picks?: { match: string; pickedParticipant: string }[];
    }>(`${config.public.apiBase}/pickem/tournament/${tournamentId}/user/picks`, {
      method: "GET",
      credentials: "include",
    });

    return res.picks ?? [];
  } catch (error) {
    console.error("Error fetching tournament by ID:", error);
    return [];
  }
}

export async function updatePickemForMatch(
  matchId: string,
  pickedParticipantId: string,
): Promise<boolean> {
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiBase}/pickem/match/${matchId}/pick`, {
      method: "POST",
      credentials: "include",
      body: {
        pickedParticipantId,
      },
    });
    return true;
  } catch (error) {
    console.error("Error updating pickem for match:", error);
    return false;
  }
}
