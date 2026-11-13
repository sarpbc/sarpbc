import type {
  SeasonArchive,
  SeasonArchivePathEntry,
  SeasonArchiveSummary,
  SeasonAward,
  SeasonParticipant,
  SeasonParticipantInput,
  SeasonPathEntry,
  SeasonPathEntryInput,
} from "@sarpbc/types";
import { isRedistributable } from "../../common/domain/data-source";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { parsePathEntry, parsePathNote } from "../domain/season-archive";
import type { SeasonRecord, SeasonStore } from "./ports";

function publicPath(path: SeasonPathEntry[]): SeasonArchivePathEntry[] {
  return path.flatMap(({ label, result, tournament }): SeasonArchivePathEntry[] => {
    if (!tournament) return [{ label, result, tournament: null }];
    if (!isRedistributable(tournament.source)) return [];
    const { id, name, slug, event } = tournament;
    return [{ label, result, tournament: { id, name, slug, event } }];
  });
}

function publicAward({ awardType, region, presentedBy, sourceUrl, player }: SeasonAward) {
  return {
    awardType,
    region,
    presentedBy,
    sourceUrl,
    player: { name: player.name, slug: player.slug },
  };
}

function toSeasonArchive(
  slug: string,
  season: SeasonRecord,
  participants: SeasonParticipant[],
  awards: SeasonAward[],
): SeasonArchive {
  return {
    slug,
    name: season.name,
    format: season.format,
    winner: participants.find(({ team }) => team.id === season.winnerTeamId)?.team ?? null,
    participants: participants.map(({ team, pathNote, path }) => ({
      team,
      pathNote,
      path: publicPath(path),
    })),
    awards: awards.map(publicAward),
  };
}

export class SeasonArchiveService {
  constructor(private readonly store: SeasonStore) {}

  published(): Promise<SeasonArchiveSummary[]> {
    return this.store.published();
  }

  async archive(slug: string): Promise<SeasonArchive> {
    const season = await this.store.findBySlug(slug);
    if (!season?.slug) throw new NotFoundError("Season not found");
    const participants = await this.store.participants(season.id);
    const awards = await this.store.awards(season.id);
    return toSeasonArchive(season.slug, season, participants, awards);
  }

  async addParticipant(
    seasonId: string,
    input: SeasonParticipantInput,
  ): Promise<SeasonParticipant> {
    const season = await this.requireSeason(seasonId);
    const team = await this.store.team(input.teamId);
    if (!team) throw new NotFoundError(`Team with id "${input.teamId}" not found`);
    if (team.mergedIntoId)
      throw new InvalidInputError(
        `Team "${team.id}" was merged into "${team.mergedIntoId}"; use that id`,
      );
    if (await this.store.participantTaken(season.id, team.id))
      throw new ConflictError(`${team.name} already takes part in ${season.name}.`);
    return this.store.saveParticipant(season.id, team.id, parsePathNote(input.pathNote));
  }

  async updatePathNote(
    seasonId: string,
    participantId: string,
    pathNote: string | null,
  ): Promise<SeasonParticipant> {
    const { participant } = await this.requireParticipant(seasonId, participantId);
    const note = parsePathNote(pathNote);
    await this.store.updatePathNote(participant.id, note);
    return { ...participant, pathNote: note };
  }

  async removeParticipant(seasonId: string, participantId: string): Promise<void> {
    const { season, participant } = await this.requireParticipant(seasonId, participantId);
    if (season.winnerTeamId === participant.team.id)
      throw new ConflictError(
        `${participant.team.name} is the winner of ${season.name}. Clear the winner before removing the team.`,
      );
    await this.store.removeParticipant(seasonId, participantId);
  }

  async addPathEntry(
    seasonId: string,
    participantId: string,
    input: SeasonPathEntryInput,
  ): Promise<SeasonPathEntry> {
    const { participant } = await this.requireParticipant(seasonId, participantId);
    const entry = parsePathEntry(input);
    if (entry.tournamentId && !(await this.store.tournamentExists(entry.tournamentId)))
      throw new NotFoundError(`Tournament with id "${entry.tournamentId}" was not found.`);
    return this.store.savePathEntry(participant.id, entry);
  }

  async removePathEntry(seasonId: string, participantId: string, entryId: string): Promise<void> {
    const { participant } = await this.requireParticipant(seasonId, participantId);
    if (!(await this.store.removePathEntry(participant.id, entryId)))
      throw new NotFoundError(`Path entry with id "${entryId}" was not found.`);
  }

  private async requireSeason(id: string): Promise<SeasonRecord> {
    const season = await this.store.find(id);
    if (!season) throw new NotFoundError("Season not found");
    return season;
  }

  private async requireParticipant(
    seasonId: string,
    participantId: string,
  ): Promise<{ season: SeasonRecord; participant: SeasonParticipant }> {
    const season = await this.requireSeason(seasonId);
    const participant = await this.store.participant(season.id, participantId);
    if (!participant)
      throw new NotFoundError(
        `Participant with id "${participantId}" was not found for season "${seasonId}"`,
      );
    return { season, participant };
  }
}
