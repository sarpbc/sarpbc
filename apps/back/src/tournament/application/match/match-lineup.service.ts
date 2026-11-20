import type { MatchLineup, MatchLineupInput } from "@sarpbc/types";
import { InvalidInputError } from "../../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../../common/domain/errors/not-found-error";
import type { Match } from "../../domain/match";
import { buildLineups, isStandIn, normalizeLineups } from "../../domain/match-lineup";
import type {
  CompetitionTransaction,
  LineupQueries,
  LineupWriter,
  MatchQueries,
  MatchWriter,
} from "../ports";

export interface StandInMatch {
  participantId: string;
  match: Match;
}

const requireMatch = async (matches: MatchWriter, id: string) => {
  const match = await matches.load(id);

  if (!match) {
    throw new NotFoundError(`Match with id "${id}" not found`);
  }

  return match;
};

const validLineups = async (
  match: Match,
  lineups: LineupWriter,
  inputs: readonly MatchLineupInput[],
) => {
  const normalized = normalizeLineups(
    match.participants.map(({ id }) => id),
    inputs,
  );

  const lineupPlayerIds = normalized.flatMap(({ playerIds }) => playerIds);

  if (!(await lineups.activePlayersExist(lineupPlayerIds))) {
    throw new InvalidInputError("Every lineup player must exist and not be a merged duplicate");
  }

  return normalized satisfies MatchLineupInput[];
};

export class MatchLineupService {
  constructor(
    private readonly reads: LineupQueries,
    private readonly matches: Pick<MatchQueries, "byIds">,
    private readonly transaction: CompetitionTransaction,
  ) {}

  async forMatch(match: Match) {
    const sides = match.participants.map(({ id, players }) => ({
      participantId: id,
      rosterIds: players.map((player) => player.id),
    }));

    return buildLineups(sides, await this.reads.byMatch(match.id)) satisfies MatchLineup[];
  }

  async find(matchId: string) {
    const match = await this.transaction.run(
      async ({ matches }) => await requireMatch(matches, matchId),
    );

    return { lineups: await this.forMatch(match) };
  }

  async set(matchId: string, inputs: readonly MatchLineupInput[]) {
    await this.transaction.run(async ({ matches, lineups }) => {
      const match = await requireMatch(matches, matchId);
      await lineups.replace(matchId, await validLineups(match, lineups, inputs));
    });

    return await this.find(matchId);
  }

  async requireProposable(matchId: string, inputs: readonly MatchLineupInput[]) {
    await this.transaction.run(async ({ matches, lineups }) => {
      const match = await requireMatch(matches, matchId);
      await validLineups(match, lineups, inputs);
    });
  }

  async standIns(playerId: string) {
    const playerRows = await this.reads.byPlayer(playerId);
    const rows = playerRows.filter(({ rosterIds }) => isStandIn(rosterIds, playerId));

    if (rows.length === 0) {
      return [];
    }

    const found = await this.matches.byIds(rows.map(({ matchId }) => matchId));
    const matches = new Map(found.map((match) => [match.id, match]));

    return rows.flatMap(({ matchId, participantId }) => {
      const match = matches.get(matchId);

      if (match?.participants.some(({ id }) => id === participantId) !== true) {
        return [];
      }

      return [{ match, participantId }];
    });
  }
}
