import type { UnlinkedStatsPlayer } from "@sarpbc/types";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type { PlayerLink, PlayerLinkStore, StatsCandidates } from "./ports";

export class StatsPlayerLinkService {
  constructor(
    private readonly candidates: StatsCandidates,
    private readonly links: PlayerLinkStore,
  ) {}

  async unlinked(tournamentId: string): Promise<UnlinkedStatsPlayer[]> {
    await this.requireTournament(tournamentId);
    return this.links.unlinked(tournamentId);
  }

  async link(tournamentId: string, link: PlayerLink): Promise<number> {
    await this.requireTournament(tournamentId);
    if (!(await this.links.onTournamentRoster(tournamentId, link.playerId)))
      throw new InvalidInputError({
        message: "Choose a player from a roster of this tournament.",
        code: "player_not_on_tournament_roster",
      });
    return this.links.link(link);
  }

  private async requireTournament(tournamentId: string): Promise<void> {
    if (!(await this.candidates.tournamentExists(tournamentId)))
      throw new NotFoundError("This tournament no longer exists. Reload the tournament list.");
  }
}
