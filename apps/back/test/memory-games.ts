import type { TournamentStatsGame } from "@sarpbc/types";
import type {
  GameRecord,
  GameStatsStore,
  PlatformAccount,
  PlayerLink,
} from "../src/match-stats/application/ports";

const toTournamentGame = (game: GameRecord): TournamentStatsGame => ({
  matchId: game.matchId,
  number: game.number,
  ballchasingId: game.ballchasingId,
  playedAt: null,
  blueParticipantId: game.blueParticipantId,
  orangeParticipantId: game.orangeParticipantId,
  blueGoals: game.blueGoals,
  orangeGoals: game.orangeGoals,
});

export class MemoryGames implements GameStatsStore {
  saved: GameRecord[] = [];
  linked: PlayerLink[] = [];
  exclusions = new Set<string>();
  async locations(ids: string[]) {
    return new Map(
      this.saved
        .filter((game) => ids.includes(game.ballchasingId))
        .map((game) => [game.ballchasingId, { matchId: game.matchId, number: game.number }]),
    );
  }
  async excluded(ids: string[]) {
    return new Set(ids.filter((id) => this.exclusions.has(id)));
  }
  async attachment() {
    return null;
  }
  async links(accounts: PlatformAccount[]) {
    return this.linked.filter((link) =>
      accounts.some((a) => a.platform === link.platform && a.platformId === link.platformId),
    );
  }
  async save(game: GameRecord) {
    this.saved.push(game);
    this.exclusions.delete(game.ballchasingId);

    for (const link of game.learnedLinks) {
      if (!this.linked.some((known) => known.platformId === link.platformId)) {
        this.linked.push(link);
      }
    }

    return toTournamentGame(game);
  }
  async byMatch() {
    return [];
  }
  async inTournament() {
    return [];
  }
  async playerLines() {
    return [];
  }
  async remove(_tournamentId: string, { matchId, number }: { matchId: string; number: number }) {
    const game = this.saved.find((saved) => saved.matchId === matchId && saved.number === number);

    if (!game) {
      return null;
    }

    this.saved = this.saved.filter((saved) => saved !== game);
    this.exclusions.add(game.ballchasingId);

    return toTournamentGame(game);
  }
}
