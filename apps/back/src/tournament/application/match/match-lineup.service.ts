import type { DataSource, MatchLineup, MatchLineupInput } from "@sarpbc/types";
import { isRedistributable } from "../../../common/domain/data-source";
import { InvalidInputError, NotFoundError } from "../../../common/domain/errors";
import type { Match } from "../../domain/competition";
import { buildLineups, isStandIn, normalizeLineups } from "../../domain/match-lineup";
import type {
  CompetitionTransaction,
  LineupQueries,
  LineupWriter,
  MatchQueries,
  MatchWriter,
} from "../ports";

export interface MatchLineups {
  source: DataSource;
  lineups: MatchLineup[];
}

export interface StandInMatch {
  participantId: string;
  match: Match;
}

export interface StandInScope {
  redistributableOnly: boolean;
}

export function lineupSource(match: Pick<Match, "source" | "tournament">): DataSource {
  return isRedistributable(match.tournament.source) ? match.source : match.tournament.source;
}

async function requireMatch(matches: MatchWriter, id: string): Promise<Match> {
  const match = await matches.load(id);
  if (!match) throw new NotFoundError(`Match with id "${id}" not found`);
  return match;
}

async function validLineups(
  match: Match,
  lineups: LineupWriter,
  inputs: readonly MatchLineupInput[],
): Promise<MatchLineupInput[]> {
  const normalized = normalizeLineups(
    match.participants.map(({ id }) => id),
    inputs,
  );
  const playerIds = normalized.flatMap(({ playerIds }) => playerIds);
  if (!(await lineups.activePlayersExist(playerIds)))
    throw new InvalidInputError("Every lineup player must exist and not be a merged duplicate");
  return normalized;
}

export class MatchLineupService {
  constructor(
    private readonly reads: LineupQueries,
    private readonly matches: Pick<MatchQueries, "byIds">,
    private readonly transaction: CompetitionTransaction,
  ) {}

  async forMatch(match: Match): Promise<MatchLineup[]> {
    const sides = match.participants.map(({ id, players }) => ({
      participantId: id,
      rosterIds: players.map((player) => player.id),
    }));
    return buildLineups(sides, await this.reads.byMatch(match.id));
  }

  async find(matchId: string): Promise<MatchLineups> {
    const match = await this.transaction.run(({ matches }) => requireMatch(matches, matchId));
    return { source: lineupSource(match), lineups: await this.forMatch(match) };
  }

  async set(matchId: string, inputs: readonly MatchLineupInput[]): Promise<MatchLineups> {
    await this.transaction.run(async ({ matches, lineups }) => {
      const match = await requireMatch(matches, matchId);
      await lineups.replace(matchId, await validLineups(match, lineups, inputs));
    });
    return this.find(matchId);
  }

  async requireProposable(matchId: string, inputs: readonly MatchLineupInput[]): Promise<void> {
    await this.transaction.run(async ({ matches, lineups }) => {
      const match = await requireMatch(matches, matchId);
      if (!isRedistributable(lineupSource(match)))
        throw new InvalidInputError("Lineups of a start.gg match cannot be proposed");
      await validLineups(match, lineups, inputs);
    });
  }

  async standIns(playerId: string, { redistributableOnly }: StandInScope): Promise<StandInMatch[]> {
    const rows = (await this.reads.byPlayer(playerId)).filter(({ rosterIds }) =>
      isStandIn(rosterIds, playerId),
    );
    if (rows.length === 0) return [];
    const matches = new Map(
      (await this.matches.byIds(rows.map(({ matchId }) => matchId))).map((match) => [
        match.id,
        match,
      ]),
    );
    return rows.flatMap(({ matchId, participantId }) => {
      const match = matches.get(matchId);
      if (!match || (redistributableOnly && !isRedistributable(lineupSource(match)))) return [];
      return [{ participantId, match }];
    });
  }
}
