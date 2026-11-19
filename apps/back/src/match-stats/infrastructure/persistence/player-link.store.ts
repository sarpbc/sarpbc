import { EntityManager, QueryOrder } from "@mikro-orm/postgresql";
import type { StatsPlayerAccount, StatsRoster } from "@sarpbc/types";
import { TournamentParticipant } from "../../../tournament/infrastructure/competition-persistence";
import type { PlayerLink, PlayerLinkStore } from "../../application/ports";
import { MatchGamePlayer } from "./match-game-player.entity";
import { PlayerPlatformLink } from "./player-platform-link.entity";
import { nameOf } from "./participant-name";

export const toLink = (row: PlayerPlatformLink) => ({
  platform: row.platform,
  platformId: row.platformId,
  playerId: row.player.id,
});

export class MikroOrmPlayerLinkStore implements PlayerLinkStore {
  constructor(private readonly em: EntityManager) {}

  async accounts(tournamentId: string) {
    const rows = await this.em.find(
      MatchGamePlayer,
      { game: { match: { tournament: tournamentId } }, platformId: { $ne: null } },
      {
        orderBy: { game: { playedAt: QueryOrder.DESC_NULLS_LAST } },
        populate: [
          "player",
          "game.blueParticipant.team",
          "game.blueParticipant.players",
          "game.orangeParticipant.team",
          "game.orangeParticipant.players",
        ],
      },
    );

    const accounts = new Map<string, StatsPlayerAccount>();

    for (const row of rows) {
      const { platformId } = row;

      if (platformId === null) {
        continue;
      }

      const key = JSON.stringify([row.platform, platformId]);
      const known = accounts.get(key);

      if (known) {
        known.games += 1;
        continue;
      }

      const participant =
        row.side === "blue" ? row.game.blueParticipant : row.game.orangeParticipant;

      accounts.set(key, {
        games: 1,
        name: row.name,
        platform: row.platform,
        platformId,
        player: row.player ? { id: row.player.id, name: row.player.name } : null,
        team: { name: nameOf(participant), participantId: participant.id },
      });
    }

    return [...accounts.values()].toSorted(
      (a, b) => a.team.name.localeCompare(b.team.name) || a.name.localeCompare(b.name),
    ) satisfies StatsPlayerAccount[];
  }

  async rosters(tournamentId: string) {
    const participants = await this.em.find(
      TournamentParticipant,
      { tournament: tournamentId },
      { populate: ["team", "players"] },
    );

    return participants
      .map((participant) => ({
        participantId: participant.id,
        players: participant.players
          .getItems()
          .map(({ id, name }) => ({ id, name }))
          .toSorted((a, b) => a.name.localeCompare(b.name)),
        teamName: nameOf(participant),
      }))
      .toSorted((a, b) => a.teamName.localeCompare(b.teamName)) satisfies StatsRoster[];
  }

  async onTournamentRoster(tournamentId: string, playerId: string) {
    return (
      (await this.em.count(TournamentParticipant, {
        players: playerId,
        tournament: tournamentId,
      })) > 0
    );
  }

  async link({ playerId, ...account }: PlayerLink) {
    return await this.em.transactional(async (em) => {
      await em.upsert(
        PlayerPlatformLink,
        { ...account, player: playerId },
        {
          onConflictAction: "merge",
          onConflictFields: ["platform", "platformId"],
          onConflictMergeFields: ["player"],
        },
      );

      return await em.nativeUpdate(MatchGamePlayer, account, { player: playerId });
    });
  }
}
