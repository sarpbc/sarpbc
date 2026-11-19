import type { StatsPlayerAccounts } from "@sarpbc/types";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { requireTournament } from "./game-record";
import type { PlayerLink, PlayerLinkStore, StatsCandidates } from "./ports";

export class StatsPlayerLinkService {
  constructor(
    private readonly candidates: StatsCandidates,
    private readonly links: PlayerLinkStore,
  ) {}

  async accounts(tournamentId: string) {
    await requireTournament(this.candidates, tournamentId);

    const [players, rosters] = await Promise.all([
      this.links.accounts(tournamentId),
      this.links.rosters(tournamentId),
    ]);

    return { players, rosters } satisfies StatsPlayerAccounts;
  }

  async link(tournamentId: string, link: PlayerLink) {
    await requireTournament(this.candidates, tournamentId);

    if (!(await this.links.onTournamentRoster(tournamentId, link.playerId))) {
      throw new InvalidInputError({
        code: "player_not_on_tournament_roster",
        message: "Choose a player from a roster of this tournament.",
      });
    }

    return await this.links.link(link);
  }
}
