import { getEventById, pickRandomEvent } from "~/data/career/events";
import {
  clearActiveCareer,
  loadActiveCareer,
  saveActiveCareer,
  saveCareerResult,
} from "~/composables/useCareerStorage";
import { applyStatDelta, getBackgroundStartingStats } from "~/utils/career/stats";
import {
  derivePlacement,
  deriveTrophies,
  pickOffseasonOffer,
  pickStartingTeam,
  simulateSeasonMatches,
} from "~/utils/career/simulation";
import type {
  CareerBackground,
  CareerPhase,
  CareerRegion,
  CareerResult,
  CareerRole,
  CareerSeasonRecord,
  CareerState,
  OnboardingStep,
} from "~/types/career";
import { EVENTS_PER_SEASON, TOTAL_SEASONS } from "~/types/career";

function createInitialState(): CareerState {
  return {
    id: crypto.randomUUID(),
    phase: "onboarding",
    onboardingStep: "intro",
    playerName: "",
    region: null,
    role: null,
    background: null,
    stats: { rating: 60, form: 60, morale: 60 },
    currentSeason: 1,
    currentTeam: "",
    eventsThisSeason: 0,
    usedEventIds: [],
    currentEventId: null,
    seasonRecords: [],
    pendingOfferTeam: null,
    result: null,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected career phase: ${String(value)}`);
}

export function useCareerSimulator() {
  const state = ref<CareerState>(createInitialState());
  const hydrated = ref(false);
  const pendingMatches = ref<CareerSeasonRecord["matches"]>([]);
  const pendingPlacement = ref<string>("");

  function persist() {
    saveActiveCareer(state.value);
  }

  function hydrate() {
    const stored = loadActiveCareer();
    if (stored) {
      state.value = stored;
    }
    hydrated.value = true;
  }

  function resetCareer() {
    clearActiveCareer();
    state.value = createInitialState();
    pendingMatches.value = [];
    pendingPlacement.value = "";
  }

  function setOnboardingStep(step: OnboardingStep) {
    state.value.onboardingStep = step;
    persist();
  }

  function setPlayerName(name: string) {
    state.value.playerName = name.trim();
    persist();
  }

  function setRegion(region: CareerRegion) {
    state.value.region = region;
    persist();
  }

  function setRole(role: CareerRole) {
    state.value.role = role;
    persist();
  }

  function setBackground(background: CareerBackground) {
    state.value.background = background;
    state.value.stats = getBackgroundStartingStats(background);
    persist();
  }

  function completeOnboarding() {
    if (!state.value.region || !state.value.role || !state.value.background) return;

    state.value.currentTeam = pickStartingTeam(state.value.region, state.value.id.charCodeAt(0));
    state.value.phase = "season_intro";
    state.value.onboardingStep = "intro";
    persist();
  }

  function startSeason() {
    state.value.eventsThisSeason = 0;
    state.value.usedEventIds = [];
    state.value.currentEventId = null;
    state.value.phase = "event";
    pickNextEvent();
    persist();
  }

  function pickNextEvent() {
    const seed =
      state.value.id.charCodeAt(0) +
      state.value.currentSeason * 17 +
      state.value.eventsThisSeason * 31;
    const event = pickRandomEvent(state.value.currentSeason, state.value.usedEventIds, seed);
    state.value.currentEventId = event.id;
    state.value.usedEventIds.push(event.id);
    state.value.phase = "event";
    persist();
  }

  function resolveEventChoice(choiceId: string) {
    const eventId = state.value.currentEventId;
    if (!eventId) return;

    const event = getEventById(eventId);
    const choice = event?.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    state.value.stats = applyStatDelta(state.value.stats, choice.delta);
    state.value.eventsThisSeason += 1;
    state.value.currentEventId = null;

    if (state.value.eventsThisSeason >= EVENTS_PER_SEASON) {
      runMatchSimulation();
    } else {
      pickNextEvent();
    }
    persist();
  }

  function runMatchSimulation() {
    const seed = state.value.id.charCodeAt(1) + state.value.currentSeason * 43;
    pendingMatches.value = simulateSeasonMatches(
      state.value.currentSeason,
      state.value.currentTeam,
      state.value.stats,
      seed,
    );
    pendingPlacement.value = derivePlacement(pendingMatches.value, state.value.currentSeason);
    state.value.phase = "match";
    persist();
  }

  function finishMatchPhase() {
    const record: CareerSeasonRecord = {
      season: state.value.currentSeason,
      team: state.value.currentTeam,
      placement: pendingPlacement.value,
      matches: pendingMatches.value,
      ratingEnd: state.value.stats.rating,
    };
    state.value.seasonRecords.push(record);

    if (state.value.currentSeason >= TOTAL_SEASONS) {
      finishCareer();
      return;
    }

    const offerSeed = state.value.id.charCodeAt(2) + state.value.currentSeason * 7;
    state.value.pendingOfferTeam = pickOffseasonOffer(
      state.value.currentTeam,
      state.value.stats,
      offerSeed,
    );
    state.value.phase = "offseason";
    persist();
  }

  function acceptOffer() {
    if (state.value.pendingOfferTeam) {
      state.value.currentTeam = state.value.pendingOfferTeam;
    }
    advanceToNextSeason();
  }

  function stayWithTeam() {
    advanceToNextSeason();
  }

  function advanceToNextSeason() {
    state.value.currentSeason += 1;
    state.value.pendingOfferTeam = null;
    state.value.phase = "season_intro";
    persist();
  }

  function finishCareer() {
    const result: CareerResult = {
      id: state.value.id,
      playerName: state.value.playerName || "Rookie",
      region: state.value.region!,
      role: state.value.role!,
      background: state.value.background!,
      finalRating: state.value.stats.rating,
      finalForm: state.value.stats.form,
      finalMorale: state.value.stats.morale,
      seasons: [...state.value.seasonRecords],
      trophies: deriveTrophies(state.value.seasonRecords),
      completedAt: new Date().toISOString(),
    };

    state.value.result = result;
    state.value.phase = "career_end";
    saveCareerResult(result);
    clearActiveCareer();
  }

  function getPhaseLabel(phase: CareerPhase): string {
    switch (phase) {
      case "onboarding":
        return "onboarding";
      case "season_intro":
        return "season_intro";
      case "event":
        return "event";
      case "match":
        return "match";
      case "offseason":
        return "offseason";
      case "career_end":
        return "career_end";
      default:
        return assertNever(phase);
    }
  }

  const currentEvent = computed(() => {
    if (!state.value.currentEventId) return null;
    return getEventById(state.value.currentEventId) ?? null;
  });

  return {
    state,
    hydrated,
    pendingMatches,
    pendingPlacement,
    currentEvent,
    hydrate,
    persist,
    resetCareer,
    setOnboardingStep,
    setPlayerName,
    setRegion,
    setRole,
    setBackground,
    completeOnboarding,
    startSeason,
    resolveEventChoice,
    finishMatchPhase,
    acceptOffer,
    stayWithTeam,
    getPhaseLabel,
  };
}
