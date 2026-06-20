import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager, EntityRepository } from "@mikro-orm/postgresql";
import { UpsertLeagueCommand } from "src/pandascore/application/commands/upsert-league.command";
import { UpsertMatchCommand } from "src/pandascore/application/commands/upsert-match.command";
import { UpsertPlayerCommand } from "src/pandascore/application/commands/upsert-player.command";
import { UpsertTeamCommand } from "src/pandascore/application/commands/upsert-team.command";
import { UpsertTournamentCommand } from "src/pandascore/application/commands/upsert-tournament.command";
import { UpsertTournamentParticipantCommand } from "src/pandascore/application/commands/upsert-tournament-participant.command";
import { Player } from "src/player/domain/player.entity";
import { Team } from "src/team/domain/team.entity";
import { TournamentParticipant } from "../domain/tournament-participant.entity";
import { Tournament } from "../domain/tournament.entity";
import { League } from "../league/league.entity";
import { LeagueService } from "../league/league.service";
import { MatchService } from "../match/match.service";

@Injectable()
export class TournamentSyncPersistence {
  private readonly logger = new Logger(TournamentSyncPersistence.name);

  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: EntityRepository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private readonly participantRepository: EntityRepository<TournamentParticipant>,
    private readonly leagueService: LeagueService,
    private readonly matchService: MatchService,
    private readonly em: EntityManager,
  ) {}

  async upsertTournament(command: UpsertTournamentCommand): Promise<Tournament> {
    let tournament = await this.tournamentRepository.findOne({
      pandascoreId: command.pandascoreId,
    });

    let league: League | undefined;
    if (command.league) {
      league = await this.upsertLeague(command.league);
    }

    if (!tournament) {
      tournament = new Tournament();
      tournament.pandascoreId = command.pandascoreId;
    }

    tournament.name = command.name;
    tournament.slug = command.slug;
    tournament.serie = command.serie;
    tournament.tier = command.tier;
    tournament.beginAt = command.beginAt;
    tournament.endAt = command.endAt;
    tournament.prizepool = command.prizepool;
    tournament.league = league;
    tournament.type = command.type;
    tournament.winnerType = command.winnerType;

    this.em.persist(tournament);
    await this.em.flush();

    if (command.expectedRoster?.length) {
      let winnerSlug = "";
      for (const participantCommand of command.expectedRoster) {
        if (participantCommand.team.pandascoreId === command.winnerPandascoreTeamId) {
          winnerSlug = participantCommand.team.slug;
        }
        await this.upsertTournamentParticipant(tournament, participantCommand);
      }

      if (winnerSlug) {
        await this.setTournamentWinnerByTeamSlug(tournament, winnerSlug);
      }
    }

    return tournament;
  }

  async upsertLeague(command: UpsertLeagueCommand): Promise<League> {
    return this.leagueService.upsertLeague({
      id: command.pandascoreId,
      name: command.name,
      slug: command.slug,
      url: command.url,
      image_url: command.imageUrl,
      modified_at: command.modifiedAt?.toISOString(),
    });
  }

  async upsertTeam(command: UpsertTeamCommand): Promise<Team> {
    let team = await this.em.findOne(Team, { slug: command.slug });

    if (!team) {
      team = new Team();
      team.slug = command.slug;
    }

    team.name = command.name;
    team.location = command.location;
    team.imageUrl = command.imageUrl;
    if (command.pandascoreId != null) {
      team.pandascoreId = command.pandascoreId;
    }

    this.em.persist(team);
    return team;
  }

  async upsertPlayer(command: UpsertPlayerCommand, team?: Team): Promise<Player> {
    let player = await this.em.findOne(Player, { slug: command.slug });

    if (!player) {
      player = new Player();
      player.slug = command.slug;
    }

    player.name = command.name;
    player.firstName = command.firstName;
    player.lastName = command.lastName;
    player.birthday = command.birthday;
    player.nationality = command.nationality;
    player.imageUrl = command.imageUrl;
    if (team) {
      player.team = team;
    }

    this.em.persist(player);
    return player;
  }

  async upsertTournamentParticipant(
    tournament: Tournament,
    command: UpsertTournamentParticipantCommand,
  ): Promise<boolean> {
    const team = await this.upsertTeam(command.team);

    const existingParticipant = await this.em.findOne(TournamentParticipant, {
      tournament,
      team,
    });

    if (existingParticipant) {
      return false;
    }

    const participant = new TournamentParticipant();
    participant.tournament = tournament;
    participant.team = team;

    for (const playerCommand of command.players) {
      const player = await this.upsertPlayer(playerCommand, team);
      participant.players.add(player);
    }

    this.em.persist(participant);
    return true;
  }

  async upsertMatchesForTournament(
    tournament: Tournament,
    commands: UpsertMatchCommand[],
  ): Promise<number> {
    const tournamentParticipants = await this.participantRepository.find(
      { tournament },
      { populate: ["team"] },
    );

    const slugToParticipantId = new Map<string, string>();
    const teamPandascoreIdToParticipantId = new Map<number, string>();
    for (const participant of tournamentParticipants) {
      if (participant.team?.slug) {
        slugToParticipantId.set(participant.team.slug, participant.id);
      }
      if (participant.team?.pandascoreId) {
        teamPandascoreIdToParticipantId.set(participant.team.pandascoreId, participant.id);
      }
    }

    const sortedCommands = [...commands].sort((a, b) => {
      const dateA = a.beginAt?.getTime() ?? 0;
      const dateB = b.beginAt?.getTime() ?? 0;
      return dateA - dateB;
    });

    let matchesCreated = 0;
    for (const command of sortedCommands) {
      if (!command.beginAt) {
        continue;
      }

      const participantIds = command.opponentSlugs
        .map((slug) => slugToParticipantId.get(slug))
        .filter((id): id is string => Boolean(id));

      const results = command.results.map((result) => ({
        participantId: teamPandascoreIdToParticipantId.get(result.teamPandascoreId) ?? null,
        score: result.score,
      }));

      await this.matchService.upsertMatch(tournament.id, {
        name: command.name,
        slug: command.slug,
        beginAt: command.beginAt,
        endAt: command.endAt,
        status: command.status,
        numberOfGames: command.numberOfGames,
        participantIds,
        pandascoreId: command.pandascoreId,
        previous_matches: command.previousMatches.map((previousMatch) => ({
          type: previousMatch.type,
          match_id: previousMatch.matchPandascoreId,
        })),
        results,
      });
      matchesCreated += 1;
    }

    return matchesCreated;
  }

  async findTournamentByPandascoreId(pandascoreId: number): Promise<Tournament | null> {
    return this.tournamentRepository.findOne({ pandascoreId });
  }

  async findTournamentById(id: string): Promise<Tournament | null> {
    return this.tournamentRepository.findOne({ id });
  }

  async getKnownTournamentPandascoreIds(): Promise<Set<number>> {
    const existingTournaments = await this.em.find(Tournament, {}, { fields: ["pandascoreId"] });
    return new Set(
      existingTournaments
        .map((tournament) => tournament.pandascoreId)
        .filter((id): id is number => id != null),
    );
  }

  private async setTournamentWinnerByTeamSlug(
    tournament: Tournament,
    winnerSlug: string,
  ): Promise<void> {
    const winnerTeam = await this.em.findOne(Team, { slug: winnerSlug });
    if (!winnerTeam) {
      return;
    }

    const winnerParticipant = await this.em.findOne(TournamentParticipant, {
      tournament,
      team: winnerTeam,
    });

    if (winnerParticipant) {
      tournament.winner = winnerParticipant;
      this.em.persist(tournament);
      await this.em.flush();
    }
  }
}
