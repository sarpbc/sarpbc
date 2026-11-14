import { EntityManager, QueryOrder } from "@mikro-orm/postgresql";
import type { StatsPlayerAccount, StatsRoster } from "@sarpbc/types";
import { TournamentParticipant } from "../../../tournament/infrastructure/competition-persistence";
import type { PlayerLink, PlayerLinkStore } from "../../application/ports";
import { MatchGamePlayer } from "./match-game-player.entity";
import { PlayerPlatformLink } from "./player-platform-link.entity";
import { nameOf } from "./participant-name";

export const toLink = (row: PlayerPlatformLink): PlayerLink => ({
  platform: row.platform,
  platformId: row.platformId,
  playerId: row.player.id,
});

export class MikroOrmPlayerLinkStore implements PlayerLinkStore {
  constructor(private readonly em: EntityManager) {}

  async accounts(tournamentId: string): Promise<StatsPlayerAccount[]> {
    const rows = await this.em.find(
      MatchGamePlayer,
      { platformId: { $ne: null }, game: { match: { tournament: tournamentId } } },
      {
        populate: [
          "player",
          "game.blueParticipant.team",
          "game.blueParticipant.players",
          "game.orangeParticipant.team",
          "game.orangeParticipant.players",
        ],
        orderBy: { game: { playedAt: QueryOrder.DESC_NULLS_LAST } },
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
        platform: row.platform,
        platformId,
        name: row.name,
        team: { participantId: participant.id, name: nameOf(participant) },
        games: 1,
        player: row.player ? { id: row.player.id, name: row.player.name } : null,
      });
    }

    return [...accounts.values()].toSorted(
      (a, b) => a.team.name.localeCompare(b.team.name) || a.name.localeCompare(b.name),
    );
  }

  async rosters(tournamentId: string): Promise<StatsRoster[]> {
    const participants = await this.em.find(
      TournamentParticipant,
      { tournament: tournamentId },
      { populate: ["team", "players"] },
    );

    return participants
      .map((participant) => ({
        participantId: participant.id,
        teamName: nameOf(participant),
        players: participant.players
          .getItems()
          .map(({ id, name }) => ({ id, name }))
          .toSorted((a, b) => a.name.localeCompare(b.name)),
      }))
      .toSorted((a, b) => a.teamName.localeCompare(b.teamName));
  }

  async onTournamentRoster(tournamentId: string, playerId: string): Promise<boolean> {
    return (
      (await this.em.count(TournamentParticipant, {
        tournament: tournamentId,
        players: playerId,
      })) > 0
    );
  }

  async link({ playerId, ...account }: PlayerLink): Promise<number> {
    return await this.em.transactional(async (em) => {
      await em.upsert(
        PlayerPlatformLink,
        { ...account, player: playerId },
        {
          onConflictFields: ["platform", "platformId"],
          onConflictAction: "merge",
          onConflictMergeFields: ["player"],
        },
      );

      return await em.nativeUpdate(MatchGamePlayer, account, { player: playerId });
    });
  }
}
