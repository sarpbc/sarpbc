import { Injectable, Logger } from "@nestjs/common";
import { PandascoreService } from "src/pandascore/pandascore.service";
import { ExpectedRosterDto } from "src/pandascore/dto/tournament.dto";
import { Player } from "src/player/domain/player.entity";
import { Team } from "src/team/domain/team.entity";
import { League } from "./league/league.entity";
import { TournamentParticipant } from "./domain/tournament-participant.entity";
import { Tournament } from "./domain/tournament.entity";
import { LeagueService } from "./league/league.service";
import { MatchService } from "./match/match.service";
import { InjectRepository } from "@mikro-orm/nestjs";
import {
  CreateRequestContext,
  EntityManager,
  EntityRepository,
  MikroORM,
} from "@mikro-orm/postgresql";

@Injectable()
export class TournamentService {
  private readonly logger = new Logger(TournamentService.name);

  constructor(
    private readonly orm: MikroORM, // Injected to make the Cron work
    @InjectRepository(Tournament)
    private readonly tournamentRepository: EntityRepository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private readonly participantRepository: EntityRepository<TournamentParticipant>,
    private readonly pandascoreService: PandascoreService,
    private readonly leagueService: LeagueService,
    private readonly matchService: MatchService,
    private readonly em: EntityManager,
  ) {}

  async onModuleInit() {
    await this.syncAllTournaments();
  }

  async find({
    limit = 20,
    offset = 0,
    pickems,
  }: {
    limit?: number;
    offset?: number;
    pickems?: boolean;
  }): Promise<Tournament[]> {
    const where: any = {};
    if (typeof pickems === "boolean") {
      where.pickemsEnabled = pickems;
    }
    const tournaments = await this.tournamentRepository.find(where, {
      limit,
      offset,
      orderBy: { beginAt: "DESC" },
      populate: ["league", "participants", "participants.team"],
    });
    return tournaments;
  }

  async findById(id: string): Promise<Tournament | null> {
    const tournament = await this.tournamentRepository.findOne(
      { id },
      {
        populate: [
          "matches",
          "matches.participants",
          "matches.participants.team",
          "matches.previousMatches",
          "participants",
          "league",
        ],
      },
    );
    return tournament;
  }

  async setTournamentPickemsEnabled(tournamentId: string, pickemsEnabled: boolean): Promise<void> {
    const tournament = await this.tournamentRepository.findOne({
      id: tournamentId,
    });

    if (!tournament) {
      throw new Error("Tournament not found");
    }

    tournament.pickemsEnabled = pickemsEnabled;
    await this.em.flush();
  }

  async upsertTournament(pandaTournament: any): Promise<Tournament> {
    let tournament = await this.tournamentRepository.findOne({
      pandascoreId: pandaTournament.id,
    });

    let league: League | undefined;
    if (pandaTournament.league) {
      league = await this.leagueService.upsertLeague(pandaTournament.league);
    }

    if (!tournament) {
      tournament = new Tournament();
      tournament.pandascoreId = pandaTournament.id;
      tournament.name = pandaTournament.name;
      tournament.slug = pandaTournament.slug;
      tournament.serie = pandaTournament.serie?.full_name;
      tournament.tier = pandaTournament.tier;
      tournament.beginAt = pandaTournament.begin_at
        ? new Date(pandaTournament.begin_at)
        : undefined;
      tournament.endAt = pandaTournament.end_at ? new Date(pandaTournament.end_at) : undefined;
      tournament.prizepool = pandaTournament.prizepool;
      tournament.league = league;
      tournament.type = pandaTournament.type;
      tournament.winnerType = pandaTournament.winner_type;

      await this.em.persist(tournament).flush();
    } else {
      tournament.name = pandaTournament.name;
      tournament.slug = pandaTournament.slug;
      tournament.serie = pandaTournament.serie?.full_name;
      tournament.tier = pandaTournament.tier;
      tournament.beginAt = pandaTournament.begin_at
        ? new Date(pandaTournament.begin_at)
        : undefined;
      tournament.endAt = pandaTournament.end_at ? new Date(pandaTournament.end_at) : undefined;
      tournament.prizepool = pandaTournament.prizepool;
      tournament.league = league;
      tournament.type = pandaTournament.type;
      tournament.winnerType = pandaTournament.winner_type;
    }

    return tournament;
  }

  @CreateRequestContext()
  async syncAllTournaments(): Promise<void> {
    try {
      this.logger.log("Starting tournament sync from PandaScore...");

      const pandascoreTournaments = await this.pandascoreService.getTournaments();

      this.logger.log(`Fetched ${pandascoreTournaments.length} tournaments from PandaScore`);

      const existingTournaments = await this.em.find(
        Tournament,
        {},
        {
          fields: ["pandascoreId"],
        },
      );
      const existingPandascoreIds = new Set(
        existingTournaments.map((t) => t.pandascoreId).filter((id) => id !== null),
      );

      let tournamentsProcessed = 0;
      let newTournamentsFound = 0;
      let participantsCreated = 0;

      for (const pandaTournament of pandascoreTournaments) {
        if (existingPandascoreIds.has(pandaTournament.id)) {
          continue;
        }

        newTournamentsFound++;
        const tournament = await this.upsertTournament(pandaTournament);

        if (pandaTournament.expected_roster && Array.isArray(pandaTournament.expected_roster)) {
          let winnerSlug = "";
          for (const pandaTeam of pandaTournament.expected_roster) {
            if (pandaTeam.team.id === pandaTournament.winner_id) {
              winnerSlug = pandaTeam.team.slug;
            }
            const participantCreated = await this.upsertTournamentParticipant(
              tournament,
              pandaTeam,
            );
            if (participantCreated) {
              participantsCreated++;
            }
          }

          if (winnerSlug) {
            const winnerTeam = await this.em.findOne(Team, {
              slug: winnerSlug,
            });
            if (winnerTeam) {
              const winnerParticipant = await this.em.findOne(TournamentParticipant, {
                tournament: tournament,
                team: winnerTeam,
              });
              if (winnerParticipant) {
                tournament.winner = winnerParticipant;
                this.em.persist(tournament);
              }
            }
          }
        }

        tournamentsProcessed++;
      }

      await this.em.flush();
      this.logger.log(
        `Successfully synced ${newTournamentsFound} new tournaments (${tournamentsProcessed} processed) with ${participantsCreated} participants. Skipped ${pandascoreTournaments.length - newTournamentsFound} existing tournaments.`,
      );
    } catch (error) {
      this.logger.error("Failed to sync tournaments", error);
      throw error;
    }
  }

  async syncTournamentFromPandascore(tournamentId: string) {
    this.logger.log(`Syncing tournament ${tournamentId} from PandaScore...`);

    await this.updateTournamentFromPandascore(tournamentId);
    await this.updateTournamentMatches(tournamentId);

    this.logger.log(`Finished syncing tournament ${tournamentId}`);
  }

  private async updateTournamentFromPandascore(tournamentId: string) {
    const tournament = await this.tournamentRepository.findOne({
      id: tournamentId,
    });

    if (!tournament) {
      throw new Error("Tournament not found");
    }

    const pandascoreId = tournament.pandascoreId;
    if (!pandascoreId) {
      throw new Error("Tournament does not have a PandaScore ID");
    }

    try {
      const pandaTournament = await this.pandascoreService.getTournamentById(pandascoreId);

      if (!pandaTournament) {
        this.logger.warn("PandaTournament not found");
        return;
      }

      const updatedTournament = await this.upsertTournament(pandaTournament);

      const teamsToCheck: ExpectedRosterDto[] = pandaTournament.expected_roster ?? [];

      for (const t of teamsToCheck) {
        const teamSlug = t.team.slug;
        const teamName = t.team.name || t.team.acronym || teamSlug;
        const teamLocation = t.team.location;
        const teamImageUrl = t.team.image_url;

        if (!teamSlug || !teamName) {
          this.logger.warn("Skipping team with missing slug or name while updating tournament:", t);
          continue;
        }

        let team = await this.em.findOne(Team, { slug: teamSlug });
        if (!team) {
          team = new Team();
          team.name = teamName;
          team.location = teamLocation;
          team.imageUrl = teamImageUrl;
          team.slug = teamSlug;
          this.em.persist(team);
        }

        const existingParticipant = await this.em.findOne(TournamentParticipant, {
          tournament: updatedTournament,
          team: team,
        });
        if (!existingParticipant) {
          const participant = new TournamentParticipant();
          participant.tournament = updatedTournament;
          participant.team = team;

          const players = t.players ?? [];
          for (const pandaPlayer of players) {
            let player = await this.em.findOne(Player, {
              slug: pandaPlayer.slug,
            });
            if (!player) {
              player = new Player();
              player.name = pandaPlayer.name;
              player.team = team;
              player.firstName = pandaPlayer.first_name;
              player.lastName = pandaPlayer.last_name ?? undefined;
              player.birthday = pandaPlayer.birthday ? new Date(pandaPlayer.birthday) : undefined;
              player.nationality = pandaPlayer.nationality;
              player.imageUrl = pandaPlayer.image_url ?? undefined;
              player.slug = pandaPlayer.slug;
              this.em.persist(player);
            }
            participant.players.add(player);
          }

          this.em.persist(participant);
        }
      }

      await this.em.flush();
    } catch (err) {
      this.logger.error("Error updating tournament from PandaScore", err);
    }
  }

  private async updateTournamentMatches(tournamentId: string): Promise<number> {
    const tournament = await this.tournamentRepository.findOne(tournamentId);
    if (!tournament) {
      this.logger.warn(`Tournament ${tournamentId} not found`);
      return -1;
    }

    if (!tournament.pandascoreId) {
      this.logger.warn(`Tournament ${tournament.id} does not have a PandaScore ID`);
      return -1;
    }

    let matchesCreated = 0;
    const tournamentParticipants = await this.participantRepository.find(
      { tournament: tournament },
      { populate: ["team"] },
    );

    const slugToParticipantId = new Map<string, string>();
    const pandaLeagueIdToParticipantId = new Map<number, string>();
    for (const p of tournamentParticipants) {
      if (p.team && p.team.slug) {
        slugToParticipantId.set(p.team.slug, p.id);
      }
      if (p.team && p.team.pandascoreId) {
        pandaLeagueIdToParticipantId.set(p.team.pandascoreId, p.id);
      }
    }

    const pandaMatches = (
      await this.pandascoreService.getTournamentBrackets(tournament.pandascoreId)
    ).sort((a, b) => {
      const dateA = a.begin_at ? new Date(a.begin_at).getTime() : 0;
      const dateB = b.begin_at ? new Date(b.begin_at).getTime() : 0;
      return dateA - dateB;
    });

    for (const pandaMatch of pandaMatches) {
      if (!pandaMatch.begin_at) {
        continue;
      }

      const participantIds: string[] = [];
      if (pandaMatch.opponents) {
        for (const opponentWrapper of pandaMatch.opponents) {
          const opponent = opponentWrapper.opponent;
          if (!opponent || !opponent.slug) {
            continue;
          }

          const participantId = slugToParticipantId.get(opponent.slug);
          if (!participantId) {
            continue;
          }

          participantIds.push(participantId);
        }
      }

      const results = pandaMatch.results.map((r) => {
        return {
          participantId: pandaLeagueIdToParticipantId.get(r.team_id) || null,
          score: r.score,
        };
      });

      const matchData = {
        name: pandaMatch.name ?? "TBD",
        beginAt: new Date(pandaMatch.begin_at),
        endAt: pandaMatch.end_at ? new Date(pandaMatch.end_at) : undefined,
        status: pandaMatch.status ?? undefined,
        numberOfGames: pandaMatch.number_of_games ?? 0,
        participantIds,
        pandascoreId: pandaMatch.id,
        previous_matches: pandaMatch.previous_matches ?? [],
        results,
      };

      await this.matchService.upsertMatch(tournament.id, matchData);
      matchesCreated++;
    }

    return matchesCreated;
  }

  private async upsertTournamentParticipant(
    tournament: Tournament,
    pandaTeam: any,
  ): Promise<boolean> {
    const teamSlug = pandaTeam.slug || pandaTeam.team?.slug;
    const teamName = pandaTeam.name || pandaTeam.team?.name || pandaTeam.acronym || teamSlug;
    const teamLocation = pandaTeam.location || pandaTeam.team?.location;
    const teamImageUrl = pandaTeam.image_url || pandaTeam.team?.image_url;

    if (!teamSlug || !teamName) {
      this.logger.warn("Skipping team with missing slug or name:", pandaTeam);
      return false;
    }

    let team = await this.em.findOne(Team, { slug: teamSlug });

    if (!team) {
      team = new Team();
      team.name = teamName;
      team.location = teamLocation;
      team.imageUrl = teamImageUrl;
      team.slug = teamSlug;
      this.em.persist(team);
    }

    const existingParticipant = await this.em.findOne(TournamentParticipant, {
      tournament: tournament,
      team: team,
    });

    if (existingParticipant) {
      return false;
    }

    const participant = new TournamentParticipant();
    participant.tournament = tournament;
    participant.team = team;

    if (pandaTeam.players && Array.isArray(pandaTeam.players)) {
      for (const pandaPlayer of pandaTeam.players) {
        let player = await this.em.findOne(Player, { slug: pandaPlayer.slug });

        if (!player) {
          player = new Player();
          player.name = pandaPlayer.name;
          player.team = team;
          player.firstName = pandaPlayer.first_name;
          player.lastName = pandaPlayer.last_name;
          player.birthday = pandaPlayer.birthday ? new Date(pandaPlayer.birthday) : undefined;
          player.nationality = pandaPlayer.nationality;
          player.imageUrl = pandaPlayer.image_url;
          player.slug = pandaPlayer.slug;
          this.em.persist(player);
        }

        participant.players.add(player);
      }
    }

    this.em.persist(participant);

    return true;
  }

  async getTournamentsByPlayer(playerId: string): Promise<Tournament[]> {
    const participants = await this.participantRepository.find(
      {
        players: { id: playerId },
      },
      {
        populate: ["tournament"],
      },
    );

    return participants.map((participant) => participant.tournament);
  }
}
