import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { TeamRepository } from "./team.repository";
import { EntityManager } from "@mikro-orm/postgresql";
import { PlayerService } from "../player/player.service";
import { PandascoreService } from "../pandascore/pandascore.service";
import { Team } from "./domain/team.entity";
import { Player } from "../player/domain/player.entity";
import { TeamSearchProps } from "./interfaces/search-team-props";

@Injectable()
export class TeamService {
  constructor(
    private readonly teamRepository: TeamRepository,
    // EntityManager kept only for the bulk PandaScore sync which requires
    // a forked context. All regular CRUD goes through the repository.
    private readonly em: EntityManager,
    @Inject(forwardRef(() => PlayerService))
    private readonly playerService: PlayerService,
    private readonly pandascoreService: PandascoreService,
  ) {}

  async find(options: Partial<TeamSearchProps>): Promise<Team[]> {
    return this.teamRepository.search(options);
  }

  async findAndCount(options: Partial<TeamSearchProps>): Promise<[Team[], number]> {
    return this.teamRepository.searchAndCount(options);
  }

  async findById(id: string): Promise<Team | null> {
    return this.teamRepository.findById(id);
  }

  async findBySlug(slug: string): Promise<Team | null> {
    return this.teamRepository.findBySlug(slug);
  }

  async getTeamWithPlayers(id: string): Promise<Team | null> {
    return this.teamRepository.findWithPlayers(id);
  }

  async create(
    name: string,
    location?: string,
    imageUrl?: string,
    slug?: string,
    pandascoreId?: number,
  ): Promise<Team> {
    const team = new Team();
    team.name = name;
    team.location = location ?? undefined;
    team.imageUrl = imageUrl ?? undefined;
    team.slug = slug ?? name.toLowerCase().replace(/\s+/g, "-");
    team.pandascoreId = pandascoreId ?? undefined;
    await this.teamRepository.save(team);
    return team;
  }

  async addPlayerToTeam(teamId: string, playerId: string): Promise<Team | null> {
    const team = await this.teamRepository.findById(teamId);
    if (!team) return null;

    const player = await this.playerService.findById(playerId);
    if (!player) return null;

    player.team = team;
    await this.em.persist(player).flush();
    return this.teamRepository.findWithPlayers(teamId);
  }

  async initializeTeamsFromPandaScore(cancelIfExistingTeam: boolean): Promise<void> {
    const em = this.em.fork();

    const existingTeams = await em.find(Team, {});
    if (existingTeams.length > 0 && cancelIfExistingTeam) {
      return;
    }

    try {
      const pandaScorePlayers = await this.pandascoreService.getRocketLeaguePlayers();
      const createdTeams = new Map<string, Team>();

      for (const pandaPlayer of pandaScorePlayers) {
        if (pandaPlayer.current_team) {
          const teamSlug = pandaPlayer.current_team.slug;
          let team = createdTeams.get(teamSlug);

          if (!team) {
            const existingTeam = await em.findOne(Team, { slug: teamSlug });
            if (!existingTeam) {
              team = new Team();
              team.slug = teamSlug;
            } else {
              team = existingTeam;
            }
            team.name = pandaPlayer.current_team.name;
            team.imageUrl = pandaPlayer.current_team.image_url ?? undefined;
            team.pandascoreId = pandaPlayer.current_team.id;
            em.persist(team);
            createdTeams.set(teamSlug, team);
          }
        }
      }

      await em.flush();

      let playersCreated = 0;
      let playersUpdated = 0;
      let playersWithoutTeam = 0;
      let playersSkippedNoSlug = 0;

      for (const pandaPlayer of pandaScorePlayers) {
        if (!pandaPlayer.slug) {
          playersSkippedNoSlug++;
          continue;
        }

        const existingPlayer = await em.findOne(Player, {
          slug: pandaPlayer.slug,
        });

        if (!existingPlayer) {
          const newPlayer = new Player();
          newPlayer.name = pandaPlayer.name;
          newPlayer.firstName = pandaPlayer.first_name ?? undefined;
          newPlayer.lastName = pandaPlayer.last_name ?? undefined;
          newPlayer.birthday = pandaPlayer.birthday ? new Date(pandaPlayer.birthday) : undefined;
          newPlayer.nationality = pandaPlayer.nationality ?? undefined;
          newPlayer.imageUrl = pandaPlayer.image_url ?? undefined;
          newPlayer.slug = pandaPlayer.slug;

          if (pandaPlayer.current_team) {
            const team = createdTeams.get(pandaPlayer.current_team.slug);
            if (team) {
              newPlayer.team = team;
            } else {
              playersWithoutTeam++;
            }
          } else {
            playersWithoutTeam++;
          }
          em.persist(newPlayer);
          playersCreated++;
        } else if (pandaPlayer.current_team) {
          const team = createdTeams.get(pandaPlayer.current_team.slug);
          if (team && existingPlayer.team?.id !== team.id) {
            existingPlayer.team = team;
            em.persist(existingPlayer);
            playersUpdated++;
          }
        }
      }

      await em.flush();

      console.log(
        `Init complete: Teams=${createdTeams.size}, Created=${playersCreated}, Updated=${playersUpdated}, NoTeam=${playersWithoutTeam}, SkippedNoSlug=${playersSkippedNoSlug}`,
      );
    } catch (error) {
      console.error("Failed to initialize teams from PandaScore:", error);
      throw error;
    }
  }
}
