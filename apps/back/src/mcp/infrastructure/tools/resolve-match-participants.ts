import { participantName } from "@sarpbc/utils";
import { InvalidInputError, NotFoundError } from "../../../common/domain/errors";
import type { Player, Team } from "../../../roster/domain/roster";
import type { Tournament, TournamentParticipant } from "../../../tournament/domain/competition";
import { findByIdOrSlug, type IdOrSlugLookup } from "./find-by-id-or-slug";

export interface MatchParticipantsInput {
  participantIds?: readonly string[];
  teams?: readonly string[];
  players?: readonly string[];
}

export interface MatchParticipantLookups {
  teams: IdOrSlugLookup<Team>;
  players: IdOrSlugLookup<Player>;
}

export async function resolveMatchParticipantIds(
  tournament: Tournament,
  input: MatchParticipantsInput,
  lookups: MatchParticipantLookups,
): Promise<TournamentParticipant[]> {
  const byParticipantId = new Map(
    tournament.participants.map((participant) => [participant.id, participant]),
  );

  const byTeamId = new Map(
    tournament.participants.flatMap((participant) =>
      participant.team ? [[participant.team.id, participant] as const] : [],
    ),
  );

  const byPlayerId = new Map(
    tournament.participants.flatMap((participant) =>
      participant.team
        ? []
        : participant.players.map((player) => [player.id, participant] as const),
    ),
  );

  const resolved: TournamentParticipant[] = [];
  const seen = new Set<string>();

  const add = (participant: TournamentParticipant) => {
    if (seen.has(participant.id)) return;
    seen.add(participant.id);
    resolved.push(participant);
  };

  const rejectParticipantId = (token: string, field: "teams" | "players") => {
    const asParticipant = byParticipantId.get(token);

    if (!asParticipant) return;
    throw new InvalidInputError(
      `"${token}" is a tournament participant id for ${participantName(asParticipant)}. Pass it in participantIds, or pass a slug in ${field}.`,
    );
  };

  for (const id of input.participantIds ?? []) {
    const participant = byParticipantId.get(id);

    if (!participant) {
      throw new InvalidInputError(
        `Participant "${id}" is not registered in this tournament. Read participants from get_tournament, or pass the team or player slug in teams or players.`,
      );
    }

    add(participant);
  }

  for (const token of input.teams ?? []) {
    rejectParticipantId(token, "teams");
    const team = await findByIdOrSlug(lookups.teams, token);

    if (!team) {
      throw new NotFoundError(
        `Team "${token}" was not found. Use search_teams to find the slug or id.`,
      );
    }

    const participant = byTeamId.get(team.id);

    if (!participant) {
      throw new InvalidInputError(
        `Team "${team.name}" (${team.slug}) is not registered in "${tournament.name}". Register it with update_tournament, or read participants from get_tournament.`,
      );
    }

    add(participant);
  }

  for (const token of input.players ?? []) {
    rejectParticipantId(token, "players");
    const player = await findByIdOrSlug(lookups.players, token);

    if (!player) {
      throw new NotFoundError(
        `Player "${token}" was not found. Use search_players to find the slug or id.`,
      );
    }

    const participant = byPlayerId.get(player.id);

    if (!participant) {
      throw new InvalidInputError(
        `Player "${player.name}" (${player.slug}) is not a participant of "${tournament.name}" without a team. Register them with update_tournament playerParticipants, or read participants from get_tournament.`,
      );
    }

    add(participant);
  }

  if (resolved.length < 2) {
    throw new InvalidInputError(
      "A match needs at least two different participants. Pass participantIds (from get_tournament), teams (team UUIDs or slugs from search_teams) and/or players (player UUIDs or slugs from search_players).",
    );
  }

  return resolved;
}
