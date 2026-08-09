import type { Tournament } from "~/types/tournament";

export interface ManualTournamentFormState {
  name: string;
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

export function tournamentToFormState(tournament: Tournament): ManualTournamentFormState {
  return {
    name: tournament.name ?? "",
    slug: tournament.slug ?? "",
    tier: tournament.tier ?? "",
    leagueId: tournament.league?.id ?? "",
    beginAt: formatDateForInput(tournament.beginAt),
    endAt: formatDateForInput(tournament.endAt),
    imageUrl: tournament.imageUrl ?? "",
    teamIds: tournament.participants?.map((participant) => participant.team.id) ?? [],
  };
}

export function buildManualTournamentPayload(state: ManualTournamentFormState) {
  const payload: {
    name: string;
    slug?: string;
    tier?: string;
    leagueId?: string | null;
    beginAt?: string | null;
    endAt?: string | null;
    imageUrl?: string | null;
    teamIds?: string[];
  } = {
    name: state.name.trim(),
  };

  const trimmedSlug = state.slug.trim();
  if (trimmedSlug) {
    payload.slug = trimmedSlug;
  }

  const trimmedTier = state.tier.trim();
  if (trimmedTier) {
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
