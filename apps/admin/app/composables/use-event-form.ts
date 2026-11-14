import type { EventInput, ManualEvent } from "@sarpbc/types";

export interface EventFormState {
  name: string;
  slug: string;
  leagueId: string;
}

export function eventToFormState(event: ManualEvent | null): EventFormState {
  return { name: event?.name ?? "", slug: event?.slug ?? "", leagueId: event?.league?.id ?? "" };
}

/** Sends only what changed so an update never trips the backend's "change at least one field". */
export function buildEventPayload(state: EventFormState, original: ManualEvent | null): EventInput {
  const before = eventToFormState(original);
  const payload: EventInput = {};
  const name = state.name.trim();
  const slug = state.slug.trim();

  if (name !== before.name) {
    payload.name = name;
  }

  if (slug && slug !== before.slug) {
    payload.slug = slug;
  }

  if (state.leagueId !== before.leagueId) {
    payload.leagueId = state.leagueId || (original ? null : undefined);
  }

  return payload;
}
