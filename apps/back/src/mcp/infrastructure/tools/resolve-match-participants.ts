import { BadRequestException, NotFoundException } from "@nestjs/common";
import { isUuid } from "../../../common/domain/entity-ref";
import type { Team } from "../../../roster/domain/roster";
import type { Tournament, TournamentParticipant } from "../../../tournament/domain/competition";

export interface MatchParticipantsInput {
  participantIds?: readonly string[];
  teams?: readonly string[];
}

export interface TeamLookup {
  findById(id: string): Promise<Team | null>;
  findBySlug(slug: string): Promise<Team | null>;
}

export async function resolveMatchParticipantIds(
  tournament: Tournament,
  input: MatchParticipantsInput,
  teams: TeamLookup,
): Promise<TournamentParticipant[]> {
  const byParticipantId = new Map(
    tournament.participants.map((participant) => [participant.id, participant]),
  );
  const byTeamId = new Map(
    tournament.participants.map((participant) => [participant.team.id, participant]),
  );
  const resolved: TournamentParticipant[] = [];
  const seen = new Set<string>();
  const add = (participant: TournamentParticipant) => {
    if (seen.has(participant.id)) return;
    seen.add(participant.id);
    resolved.push(participant);
  };

  for (const id of input.participantIds ?? []) {
    const participant = byParticipantId.get(id);
    if (!participant) {
      throw new BadRequestException(
        `Participant "${id}" is not registered in this tournament. Read participants from get_tournament, or pass the team slug or id in teams.`,
      );
    }
    add(participant);
  }

  for (const token of input.teams ?? []) {
    const asParticipant = byParticipantId.get(token);
    if (asParticipant) {
      throw new BadRequestException(
        `"${token}" is a tournament participant id for ${asParticipant.team.name} (${asParticipant.team.slug}). Pass it in participantIds, or pass "${asParticipant.team.slug}" in teams.`,
      );
    }
    const team = await findTeam(teams, token);
    if (!team) {
      throw new NotFoundException(
        `Team "${token}" was not found. Use search_teams to find the slug or id.`,
      );
    }
    const participant = byTeamId.get(team.id);
    if (!participant) {
      throw new BadRequestException(
        `Team "${team.name}" (${team.slug}) is not registered in "${tournament.name}". Register it with update_tournament, or read participants from get_tournament.`,
      );
    }
    add(participant);
  }

  if (resolved.length < 2) {
    throw new BadRequestException(
      "A match needs at least two different participants. Pass participantIds (from get_tournament) and/or teams (team UUIDs or slugs from search_teams).",
    );
  }
  return resolved;
}

async function findTeam(teams: TeamLookup, token: string): Promise<Team | null> {
  if (!isUuid(token)) return teams.findBySlug(token);
  return (await teams.findById(token)) ?? teams.findBySlug(token);
}
