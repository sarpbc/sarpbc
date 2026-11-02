import type { TournamentDetail } from "@sarpbc/types";
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
  teamIds: string[];
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
    teamIds: [],
  };
}

export function suggestTournamentSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) {
    return "";
  }
  return new Date(date).toISOString().substring(0, 10);
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
    teamIds: tournament.participants.map((participant) => participant.team.id),
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
  payload.teamIds = state.teamIds;

  return payload;
}

export function validateManualTournamentForm(state: ManualTournamentFormState): string | null {
  if (!state.name.trim()) {
    return "nameRequired";
  }

  if (state.beginAt && state.endAt && state.endAt < state.beginAt) {
    return "endBeforeStart";
  }

  return null;
}
