import type { StatsRoster } from "@sarpbc/types";
import type { PlayerLink, PlayerLinkStore } from "./ports";

export class InMemoryPlayerLinks implements PlayerLinkStore {
  readonly linked: PlayerLink[] = [];
  private readonly rosterList: StatsRoster[];
  private readonly repointed: number;

  constructor(rosterList: StatsRoster[], repointed: number) {
    this.rosterList = rosterList;
    this.repointed = repointed;
  }

  async accounts() {
    return [];
  }

  async rosters() {
    return this.rosterList;
  }

  async onTournamentRoster(_tournamentId: string, playerId: string) {
    return this.rosterList.some(({ players }) => players.some(({ id }) => id === playerId));
  }

  async link(link: PlayerLink) {
    this.linked.push(link);

    return this.repointed;
  }
}
