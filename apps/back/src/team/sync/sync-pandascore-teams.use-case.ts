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
        const existingPlayer = await em.findOne(Player, { slug: playerCommand.slug });

        if (!existingPlayer) {
          const newPlayer = new Player();
          newPlayer.name = playerCommand.name;
          newPlayer.firstName = playerCommand.firstName ?? null;
          newPlayer.lastName = playerCommand.lastName ?? null;
          newPlayer.birthday = playerCommand.birthday ?? null;
          newPlayer.nationality = playerCommand.nationality ?? null;
          newPlayer.imageUrl = playerCommand.imageUrl ?? null;
          newPlayer.role = playerCommand.role ?? null;
          newPlayer.slug = playerCommand.slug;

          if (playerCommand.teamSlug) {
            const team = createdTeams.get(playerCommand.teamSlug);
            if (team) {
              newPlayer.team = team;
            }
          }

          em.persist(newPlayer);
          playersCreated += 1;
        } else {
          let changed = false;

          if (playerCommand.teamSlug) {
            const team = createdTeams.get(playerCommand.teamSlug);
            if (team && existingPlayer.team?.id !== team.id) {
              existingPlayer.team = team;
              changed = true;
            }
          }

          const nextRole = playerCommand.role ?? null;
          if (existingPlayer.role !== nextRole) {
            existingPlayer.role = nextRole;
            changed = true;
          }

          if (changed) {
            em.persist(existingPlayer);
            playersUpdated += 1;
          }
        }
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
