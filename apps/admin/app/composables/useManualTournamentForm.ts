import { TEAM_SIZE_BY_FORMAT } from "@sarpbc/utils";
import type { ParticipantPlayer, TournamentDetail, TournamentFormat } from "@sarpbc/types";
import type { ManualTournamentInput } from "./tournaments";

export interface ManualTournamentFormState {
  name: string;
  /** Empty when creating the tournament with a new event of its own. */
  eventId: string;
  slug: string;
  tier: string;
  leagueId: string;
  beginAt: string;
  endAt: string;
  imageUrl: string;
  format: TournamentFormat;
  teamIds: string[];
  playerParticipants: ParticipantPlayer[][];
  hasBracket: boolean;
}

export function createEmptyTournamentFormState(): ManualTournamentFormState {
  return {
    name: "",
    eventId: "",
    slug: "",
    tier: "",
    leagueId: "",
    beginAt: "",
    endAt: "",
    imageUrl: "",
    format: "3v3",
    teamIds: [],
    playerParticipants: [],
    hasBracket: false,
  };
}

export function tournamentToFormState(tournament: TournamentDetail): ManualTournamentFormState {
  return {
    name: tournament.name ?? "",
    eventId: tournament.event.id,
    slug: tournament.event.slug,
    tier: tournament.tier ?? "",
    leagueId: tournament.league?.id ?? "",
    beginAt: formatDateForInput(tournament.beginAt),
    endAt: formatDateForInput(tournament.endAt),
    imageUrl: tournament.imageUrl ?? "",
    format: tournament.format,
    teamIds: tournament.participants.flatMap(({ team }) => (team ? [team.id] : [])),
    playerParticipants: tournament.participants.flatMap(({ team, players }) =>
      team ? [] : [players.map(({ id, name, slug }) => ({ id, name, slug }))],
    ),
    hasBracket: tournament.hasBracket,
  };
}

/** The slug belongs to the event, so it only applies while the tournament keeps its event. */
export function editsEventSlug(
  state: ManualTournamentFormState,
  original: TournamentDetail | null,
): boolean {
  return original ? state.eventId === original.event.id : !state.eventId;
}

export function buildManualTournamentPayload(
  state: ManualTournamentFormState,
  original: TournamentDetail | null,
) {
  const payload: ManualTournamentInput = {
    name: state.name.trim(),
  };

  const trimmedSlug = state.slug.trim();
  if (!editsEventSlug(state, original)) {
    payload.eventId = state.eventId;
  } else if (trimmedSlug && trimmedSlug !== original?.event.slug) {
    payload.slug = trimmedSlug;
  }

  const trimmedTier = state.tier.trim();
  if (original) {
    payload.tier = trimmedTier || null;
  } else if (trimmedTier) {
    payload.tier = trimmedTier;
  }

  payload.leagueId = state.leagueId || null;
  payload.beginAt = state.beginAt || null;
  payload.endAt = state.endAt || null;

  const trimmedImageUrl = state.imageUrl.trim();
  payload.imageUrl = trimmedImageUrl || null;
  payload.format = state.format;
  payload.teamIds = state.format === "1v1" ? [] : state.teamIds;
  payload.playerParticipants =
    state.format === "3v3"
      ? []
      : state.playerParticipants.map((players) => players.map(({ id }) => id));
  payload.hasBracket = state.hasBracket;

  return payload;
}

export function validateManualTournamentForm(state: ManualTournamentFormState): string | null {
  if (!state.name.trim()) {
    return "nameRequired";
  }

  if (state.beginAt && state.endAt && state.endAt < state.beginAt) {
    return "endBeforeStart";
  }

  if (
    state.format !== "3v3" &&
    state.playerParticipants.some((players) => players.length !== TEAM_SIZE_BY_FORMAT[state.format])
  ) {
    return "incompletePlayerParticipant";
  }

  return null;
}
