import type { TournamentStatsGame } from "@sarpbc/types";
import type {
  GameAttachment,
  GameRecord,
  GameStatsStore,
  PlatformAccount,
  PlayerLink,
  ReplayAppend,
} from "../src/match-stats/application/ports";
import type { GameLocation } from "../src/match-stats/domain/replay-matching";

const sum = (game: GameRecord, side: "blueGoals" | "orangeGoals") =>
  game.replays.reduce((total, replay) => total + replay[side], 0);

const toTournamentGame = (game: GameRecord) =>
  ({
    blueGoals: sum(game, "blueGoals"),
    blueParticipantId: game.blueParticipantId,
    matchId: game.matchId,
    number: game.number,
    orangeGoals: sum(game, "orangeGoals"),
    orangeParticipantId: game.orangeParticipantId,
    playedAt: game.replays.at(0)?.playedAt?.toISOString() ?? null,
    replays: game.replays.map((replay) => ({
      ballchasingId: replay.ballchasingId,
      blueGoals: replay.blueGoals,
      orangeGoals: replay.orangeGoals,
      playedAt: replay.playedAt?.toISOString() ?? null,
    })),
  }) satisfies TournamentStatsGame;

const replayIds = (game: GameRecord) => game.replays.map((replay) => replay.ballchasingId);

export class MemoryGames implements GameStatsStore {
  saved: GameRecord[] = [];
  linked: PlayerLink[] = [];
  exclusions = new Set<string>();
  attachments = new Map<string, GameAttachment>();
  async locations(ids: string[]) {
    return new Map(
      this.saved.flatMap((game) =>
        replayIds(game)
          .filter((id) => ids.includes(id))
          .map((id) => [id, { matchId: game.matchId, number: game.number }] as const),
      ),
    );
  }
  async excluded(ids: string[]) {
    return new Set(ids.filter((id) => this.exclusions.has(id)));
  }
  async attachment(replayId: string) {
    return this.attachments.get(replayId) ?? null;
  }
  async links(accounts: PlatformAccount[]) {
    return this.linked.filter((link) =>
      accounts.some((a) => a.platform === link.platform && a.platformId === link.platformId),
    );
  }
  async save(game: GameRecord) {
    this.saved.push(game);
    this.learn(game.learnedLinks);

    for (const id of replayIds(game)) {
      this.exclusions.delete(id);
    }

    return toTournamentGame(game);
  }
  async appendReplay(
    _tournamentId: string,
    { matchId, number }: GameLocation,
    { replay, learnedLinks }: ReplayAppend,
  ) {
    const game = this.gameAt(matchId, number);

    if (!game) {
      return null;
    }

    const appended = { ...game, replays: [...game.replays, replay] };
    this.saved = this.saved.map((saved) => (saved === game ? appended : saved));
    this.exclusions.delete(replay.ballchasingId);
    this.learn(learnedLinks);

    return toTournamentGame(appended);
  }
  async game(_tournamentId: string, { matchId, number }: GameLocation) {
    const game = this.gameAt(matchId, number);

    return game ? toTournamentGame(game) : null;
  }
  async removeReplay(_tournamentId: string, { matchId, number }: GameLocation, replayId: string) {
    const game = this.gameAt(matchId, number);

    if (game === undefined || !game.replays.some((replay) => replay.ballchasingId === replayId)) {
      return null;
    }

    const kept = {
      ...game,
      replays: game.replays.filter((replay) => replay.ballchasingId !== replayId),
    };

    this.saved = this.saved.map((saved) => (saved === game ? kept : saved));
    this.exclusions.add(replayId);

    return toTournamentGame(kept);
  }
  async byMatch() {
    return [];
  }
  async inTournament() {
    return this.saved.toSorted((a, b) => a.number - b.number).map(toTournamentGame);
  }
  async playerStats() {
    return { games: 0, tallies: [], unlinkedAccounts: 0 };
  }
  async remove(_tournamentId: string, { matchId, number }: GameLocation) {
    const game = this.gameAt(matchId, number);

    if (!game) {
      return null;
    }

    this.saved = this.saved.filter((saved) => saved !== game);

    for (const id of replayIds(game)) {
      this.exclusions.add(id);
    }

    return toTournamentGame(game);
  }
  private gameAt(matchId: string, number: number) {
    return this.saved.find((saved) => saved.matchId === matchId && saved.number === number);
  }
  private learn(links: PlayerLink[]) {
    for (const link of links) {
      if (!this.linked.some((known) => known.platformId === link.platformId)) {
        this.linked.push(link);
      }
    }
  }
}
