import { Inject, Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import {
  PANDASCORE_GATEWAY,
  PandascoreGateway,
} from "src/pandascore/application/ports/pandascore.gateway.port";
import { PandascorePlayerMapper } from "src/pandascore/application/mappers/pandascore-player.mapper";
import { PandascoreTeamMapper } from "src/pandascore/application/mappers/pandascore-team.mapper";
import { createLogger } from "evlog";
import { Player } from "src/player/player.entities";
import { availablePlayerSlug, findPandascorePlayer } from "src/player/find-pandascore-player";
import { Team } from "src/player/player.entities";

@Injectable()
export class SyncPandascoreTeamsUseCase {
  constructor(
    private readonly em: EntityManager,
    @Inject(PANDASCORE_GATEWAY)
    private readonly pandascoreGateway: PandascoreGateway,
  ) {}

  async execute(cancelIfExistingTeam: boolean): Promise<void> {
    const log = createLogger({ component: SyncPandascoreTeamsUseCase.name });

    try {
      const em = this.em.fork();
      const existingTeams = await em.find(Team, {});
      if (existingTeams.length > 0 && cancelIfExistingTeam) {
        log.set({ skipped: true, reason: "teams_already_exist" });
        return;
      }

      const pandaScorePlayers = await this.pandascoreGateway.getRocketLeaguePlayers();
      const createdTeams = new Map<string, Team>();

      for (const pandaPlayer of pandaScorePlayers) {
        if (!pandaPlayer.current_team) {
          continue;
        }

        const teamCommand = PandascoreTeamMapper.fromCurrentTeam(pandaPlayer.current_team);
        const teamSlug = teamCommand.slug;
        let team = createdTeams.get(teamSlug);

        if (!team) {
          const existingTeam = await em.findOne(Team, { slug: teamSlug });
          team = existingTeam ?? new Team();
          team.slug = teamSlug;
          team.name = teamCommand.name;
          team.imageUrl = teamCommand.imageUrl ?? null;
          team.darkModeImageUrl = teamCommand.darkModeImageUrl ?? null;
          team.pandascoreId = teamCommand.pandascoreId ?? null;
          em.persist(team);
          createdTeams.set(teamSlug, team);
        }
      }

      await em.flush();

      let playersCreated = 0;
      let playersUpdated = 0;

      for (const pandaPlayer of pandaScorePlayers) {
        if (!pandaPlayer.slug) {
          continue;
        }

        const playerCommand = PandascorePlayerMapper.fromRocketLeaguePlayer(pandaPlayer);
        const existingPlayer = await findPandascorePlayer(
          em,
          playerCommand.pandascoreId,
          playerCommand.slug,
        );

        const player = existingPlayer ?? new Player();
        if (existingPlayer) {
          playersUpdated += 1;
        } else {
          player.slug = await availablePlayerSlug(
            em,
            playerCommand.pandascoreId,
            playerCommand.slug,
          );
          playersCreated += 1;
        }

        player.pandascoreId = playerCommand.pandascoreId;
        player.name = playerCommand.name;
        player.firstName = playerCommand.firstName ?? null;
        player.lastName = playerCommand.lastName ?? null;
        player.birthday = playerCommand.birthday ?? null;
        player.nationality = playerCommand.nationality ?? null;
        player.imageUrl = playerCommand.imageUrl ?? null;
        player.role = playerCommand.role ?? null;
        player.team = playerCommand.teamSlug
          ? (createdTeams.get(playerCommand.teamSlug) ?? null)
          : null;

        em.persist(player);
      }

      await em.flush();

      log.set({
        sync: {
          teams: createdTeams.size,
          playersCreated,
          playersUpdated,
        },
      });
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      log.emit();
    }
  }
}
