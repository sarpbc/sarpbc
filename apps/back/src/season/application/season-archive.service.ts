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
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { parsePathEntry, parsePathNote } from "../domain/season-archive";
import type { SeasonRecord, SeasonStore } from "./ports";

const publicPath = (path: SeasonPathEntry[]) =>
  path.flatMap<SeasonArchivePathEntry>(({ label, result, tournament }) => {
    if (!tournament) {
      return [{ label, result, tournament: null }];
    }

    if (!isRedistributable(tournament.source)) {
      return [];
    }

    const { id, name, slug, event } = tournament;

    return [{ label, result, tournament: { event, id, name, slug } }];
  }) satisfies SeasonArchivePathEntry[];

const publicAward = ({ awardType, region, presentedBy, sourceUrl, player }: SeasonAward) => ({
  awardType,
  player: { name: player.name, slug: player.slug },
  presentedBy,
  region,
  sourceUrl,
});

const toSeasonArchive = (
  slug: string,
  season: SeasonRecord,
  participants: SeasonParticipant[],
  awards: SeasonAward[],
) =>
  ({
    awards: awards.map(publicAward),
    format: season.format,
    name: season.name,
    participants: participants.map(({ team, pathNote, path }) => ({
      path: publicPath(path),
      pathNote,
      team,
    })),
    slug,
    winner: participants.find(({ team }) => team.id === season.winnerTeamId)?.team ?? null,
  }) satisfies SeasonArchive;

export class SeasonArchiveService {
  constructor(private readonly store: SeasonStore) {}

  async published() {
    return (await this.store.published()) satisfies SeasonArchiveSummary[];
  }

  async archive(slug: string) {
    const season = await this.store.findBySlug(slug);

    if (season?.slug === null || season?.slug === undefined || season?.slug === "") {
      throw new NotFoundError("Season not found");
    }

    const participants = await this.store.participants(season.id);
    const awards = await this.store.awards(season.id);

    return toSeasonArchive(season.slug, season, participants, awards) satisfies SeasonArchive;
  }

  async addParticipant(seasonId: string, input: SeasonParticipantInput) {
    const season = await this.requireSeason(seasonId);
    const team = await this.store.team(input.teamId);

    if (!team) {
      throw new NotFoundError(`Team with id "${input.teamId}" not found`);
    }

    if (team.mergedIntoId !== null && team.mergedIntoId !== "") {
      throw new InvalidInputError(
        `Team "${team.id}" was merged into "${team.mergedIntoId}"; use that id`,
      );
    }

    if (await this.store.participantTaken(season.id, team.id)) {
      throw new ConflictError(`${team.name} already takes part in ${season.name}.`);
    }

    return (await this.store.saveParticipant(
      season.id,
      team.id,
      parsePathNote(input.pathNote),
    )) satisfies SeasonParticipant;
  }

  async updatePathNote(seasonId: string, participantId: string, pathNote: string | null) {
    const { participant } = await this.requireParticipant(seasonId, participantId);
    const note = parsePathNote(pathNote);
    await this.store.updatePathNote(participant.id, note);

    return { ...participant, pathNote: note } satisfies SeasonParticipant;
  }

  async removeParticipant(seasonId: string, participantId: string) {
    const { season, participant } = await this.requireParticipant(seasonId, participantId);

    if (season.winnerTeamId === participant.team.id) {
      throw new ConflictError(
        `${participant.team.name} is the winner of ${season.name}. Clear the winner before removing the team.`,
      );
    }

    await this.store.removeParticipant(seasonId, participantId);
  }

  async addPathEntry(seasonId: string, participantId: string, input: SeasonPathEntryInput) {
    const { participant } = await this.requireParticipant(seasonId, participantId);
    const entry = parsePathEntry(input);

    if (
      entry.tournamentId !== null &&
      entry.tournamentId !== "" &&
      !(await this.store.tournamentExists(entry.tournamentId))
    ) {
      throw new NotFoundError(`Tournament with id "${entry.tournamentId}" was not found.`);
    }

    return (await this.store.savePathEntry(participant.id, entry)) satisfies SeasonPathEntry;
  }

  async removePathEntry(seasonId: string, participantId: string, entryId: string) {
    const { participant } = await this.requireParticipant(seasonId, participantId);

    if (!(await this.store.removePathEntry(participant.id, entryId))) {
      throw new NotFoundError(`Path entry with id "${entryId}" was not found.`);
    }
  }

  private async requireSeason(id: string) {
    const season = await this.store.find(id);

    if (!season) {
      throw new NotFoundError("Season not found");
    }

    return season;
  }

  private async requireParticipant(seasonId: string, participantId: string) {
    const season = await this.requireSeason(seasonId);
    const participant = await this.store.participant(season.id, participantId);

    if (!participant) {
      throw new NotFoundError(
        `Participant with id "${participantId}" was not found for season "${seasonId}"`,
      );
    }

    return { participant, season } satisfies {
      season: SeasonRecord;
      participant: SeasonParticipant;
    };
  }
}
