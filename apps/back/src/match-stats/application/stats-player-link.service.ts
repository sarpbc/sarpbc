import type { StatsPlayerAccounts } from "@sarpbc/types";
import { InvalidInputError } from "../../common/domain/errors";
import { requireTournament } from "./game-record";
import type { PlayerLink, PlayerLinkStore, StatsCandidates } from "./ports";

export class StatsPlayerLinkService {
  constructor(
    private readonly candidates: StatsCandidates,
    private readonly links: PlayerLinkStore,
  ) {}

  async accounts(tournamentId: string): Promise<StatsPlayerAccounts> {
    await requireTournament(this.candidates, tournamentId);
    const [players, rosters] = await Promise.all([
      this.links.accounts(tournamentId),
      this.links.rosters(tournamentId),
    ]);
    return { players, rosters };
  }

  async link(tournamentId: string, link: PlayerLink): Promise<number> {
    await requireTournament(this.candidates, tournamentId);
    if (!(await this.links.onTournamentRoster(tournamentId, link.playerId)))
      throw new InvalidInputError({
        message: "Choose a player from a roster of this tournament.",
        code: "player_not_on_tournament_roster",
      });
    return this.links.link(link);
  }
}
