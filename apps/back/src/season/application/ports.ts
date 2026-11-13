import type {
  PlayerSeasonAward,
  SeasonArchiveSummary,
  SeasonAward,
  SeasonFormat,
  SeasonParticipant,
  SeasonPathEntry,
  SeasonSummary,
} from "@sarpbc/types";
import type { SeasonPathEntryFields } from "../domain/season-archive";
import type { SeasonAwardFields } from "../domain/season-award";

export interface SeasonAwardPlayer {
  id: string;
  name: string;
  mergedIntoId: string | null;
}

export interface SeasonParticipantTeam {
  id: string;
  name: string;
  mergedIntoId: string | null;
}

export interface SeasonRecord extends SeasonSummary {
  format: SeasonFormat;
  winnerTeamId: string | null;
}

export interface SeasonStore {
  list(): Promise<SeasonSummary[]>;
  published(): Promise<SeasonArchiveSummary[]>;
  find(id: string): Promise<SeasonRecord | null>;
  findBySlug(slug: string): Promise<SeasonRecord | null>;
  nameTaken(name: string, exceptId: string | null): Promise<boolean>;
  slugTaken(slug: string, exceptId: string | null): Promise<boolean>;
  save(season: SeasonRecord): Promise<void>;
  remove(id: string): Promise<boolean>;
  awards(seasonId: string): Promise<SeasonAward[]>;
  awardsOfPlayer(playerId: string): Promise<PlayerSeasonAward[]>;
  player(id: string): Promise<SeasonAwardPlayer | null>;
  awardTaken(
    seasonId: string,
    award: Pick<SeasonAwardFields, "awardType" | "region">,
  ): Promise<boolean>;
  saveAward(seasonId: string, playerId: string, award: SeasonAwardFields): Promise<SeasonAward>;
  removeAward(seasonId: string, awardId: string): Promise<boolean>;
  team(id: string): Promise<SeasonParticipantTeam | null>;
  tournamentExists(id: string): Promise<boolean>;
  participants(seasonId: string): Promise<SeasonParticipant[]>;
  participant(seasonId: string, participantId: string): Promise<SeasonParticipant | null>;
  participantTaken(seasonId: string, teamId: string): Promise<boolean>;
  saveParticipant(
    seasonId: string,
    teamId: string,
    pathNote: string | null,
  ): Promise<SeasonParticipant>;
  updatePathNote(participantId: string, pathNote: string | null): Promise<void>;
  removeParticipant(seasonId: string, participantId: string): Promise<boolean>;
  savePathEntry(participantId: string, entry: SeasonPathEntryFields): Promise<SeasonPathEntry>;
  removePathEntry(participantId: string, entryId: string): Promise<boolean>;
}
