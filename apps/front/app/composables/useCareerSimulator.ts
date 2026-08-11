import { getEventById, pickRandomEvent } from "~/data/career/events";
import { getWorldTeamById } from "~/data/career/world";
import {
  clearActiveCareer,
  loadActiveCareer,
  saveActiveCareer,
  saveCareerResult,
} from "~/composables/useCareerStorage";
import { applyStatDelta, getStartingStats } from "~/utils/career/stats";
import {
  MAJOR_POINTS,
  computeSeasonPoints,
  computeWorldRankings,
  deriveTrophies,
  getSplitFeedback,
  getWorldsFeedback,
  hashString,
  pickOffseasonOffer,
  pickStartingTeam,
  simulateSplit,
  simulateWorlds,
} from "~/utils/career/simulation";
import type {
  CareerBackground,
  CareerCountry,
  CareerRegion,
  CareerResult,
  CareerRole,
  CareerSeasonRecord,
  CareerSplitRecord,
  CareerState,
  OnboardingStep,
} from "~/types/career";
import { SPLITS_PER_SEASON, TOTAL_SEASONS, WORLDS_QUALIFICATION_POINTS } from "~/types/career";

function createInitialState(): CareerState {
  return {
    id: crypto.randomUUID(),
    phase: "onboarding",
    onboardingStep: "intro",
    playerName: "",
    region: null,
    country: null,
    role: null,
    background: null,
    stats: { rating: 60, form: 60, morale: 60 },
    currentSeason: 1,
    currentStage: "split1",
    currentTeamId: "",
    usedEventIds: [],
    currentEventId: null,
    currentSplits: [],
    currentWorlds: null,
    seasonRecords: [],
    pendingOfferTeamId: null,
    result: null,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected career stage: ${String(value)}`);
}

export function useCareerSimulator() {
  const state = ref<CareerState>(createInitialState());
  const hydrated = ref(false);

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
    if (state.value.region !== region) {
      state.value.country = null;
    }
    state.value.region = region;
    persist();
  }

  function setCountry(country: CareerCountry) {
    state.value.country = country;
    persist();
  }

  function setRole(role: CareerRole) {
    state.value.role = role;
    persist();
  }

  function setBackground(background: CareerBackground) {
    state.value.background = background;
    persist();
  }

  function completeOnboarding() {
    const { region, country, role, background } = state.value;
    if (!region || !country || !role || !background) return;

    state.value.stats = getStartingStats(background, role);
    state.value.currentTeamId = pickStartingTeam(region);
    state.value.phase = "season_intro";
    state.value.onboardingStep = "intro";
    persist();
  }

  /** Completed world steps — drives the ranking drift over time. */
  const worldStepIndex = computed(
    () => (state.value.currentSeason - 1) * SPLITS_PER_SEASON + state.value.currentSplits.length,
  );

  const worldRankings = computed(() =>
    computeWorldRankings(state.value.id, worldStepIndex.value, {
      name: state.value.playerName || "Rookie",
      teamId: state.value.currentTeamId || null,
      rating: state.value.stats.rating,
      region: state.value.region,
    }),
  );

  const currentTeamName = computed(
    () => getWorldTeamById(state.value.currentTeamId)?.name ?? state.value.currentTeamId,
  );

  const seasonPoints = computed(() => computeSeasonPoints(state.value.currentSplits));

  function startSeason() {
    state.value.currentStage = "split1";
    state.value.currentSplits = [];
    state.value.currentWorlds = null;
    pickNextEvent("split");
    persist();
  }

  function pickNextEvent(pool: "split" | "worlds") {
    const seed = hashString(
      `${state.value.id}:event:${state.value.currentSeason}:${state.value.currentStage}`,
    );
    const event = pickRandomEvent(pool, state.value.usedEventIds, seed);
    state.value.currentEventId = event.id;
    state.value.usedEventIds.push(event.id);
    state.value.phase = "event";
  }

  function resolveEventChoice(choiceId: string) {
    const eventId = state.value.currentEventId;
    if (!eventId) return;

    const event = getEventById(eventId);
    const choice = event?.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    state.value.stats = applyStatDelta(state.value.stats, choice.delta);
    state.value.currentEventId = null;
    runStageSimulation();
    persist();
  }

  function runStageSimulation() {
    const stage = state.value.currentStage;
    const seed = hashString(`${state.value.id}:sim:${state.value.currentSeason}:${stage}`);

    switch (stage) {
      case "split1":
      case "split2": {
        const sim = simulateSplit(state.value.stats, state.value.role!, seed);
        state.value.stats = applyStatDelta(state.value.stats, getSplitFeedback(sim));
        const record: CareerSplitRecord = {
          split: stage === "split1" ? 1 : 2,
          regionals: sim.regionals,
          major: sim.major,
          points: sim.points,
        };
        state.value.currentSplits.push(record);
        break;
      }
      case "worlds": {
        const placement = simulateWorlds(state.value.stats, state.value.role!, seed);
        state.value.stats = applyStatDelta(state.value.stats, getWorldsFeedback(placement));
        state.value.currentWorlds = placement;
        break;
      }
      default:
        assertNever(stage);
    }

    state.value.phase = "stage_result";
  }

  const qualifiedForWorlds = computed(() => seasonPoints.value >= WORLDS_QUALIFICATION_POINTS);

  function continueAfterResult() {
    const stage = state.value.currentStage;

    switch (stage) {
      case "split1":
        state.value.currentStage = "split2";
        pickNextEvent("split");
        break;
      case "split2":
        if (qualifiedForWorlds.value) {
          state.value.currentStage = "worlds";
          pickNextEvent("worlds");
        } else {
          endSeason();
        }
        break;
      case "worlds":
        endSeason();
        break;
      default:
        assertNever(stage);
    }
    persist();
  }

  function endSeason() {
    const worlds = state.value.currentWorlds;
    const record: CareerSeasonRecord = {
      season: state.value.currentSeason,
      teamId: state.value.currentTeamId,
      teamName: currentTeamName.value,
      splits: [...state.value.currentSplits],
      worlds,
      points: seasonPoints.value + (worlds ? MAJOR_POINTS[worlds] : 0),
      ratingEnd: state.value.stats.rating,
    };
    state.value.seasonRecords.push(record);

    if (state.value.currentSeason >= TOTAL_SEASONS) {
      finishCareer();
      return;
    }

    const offerSeed = hashString(`${state.value.id}:offer:${state.value.currentSeason}`);
    state.value.pendingOfferTeamId = pickOffseasonOffer(
      state.value.currentTeamId,
      record.points,
      worldRankings.value,
      offerSeed,
    );
    state.value.phase = "offseason";
  }

  function acceptOffer() {
    if (state.value.pendingOfferTeamId) {
      state.value.currentTeamId = state.value.pendingOfferTeamId;
    }
    advanceToNextSeason();
  }

  function stayWithTeam() {
    advanceToNextSeason();
  }

  function advanceToNextSeason() {
    state.value.currentSeason += 1;
    state.value.currentStage = "split1";
    state.value.currentSplits = [];
    state.value.currentWorlds = null;
    state.value.pendingOfferTeamId = null;
    state.value.phase = "season_intro";
    persist();
  }

  function finishCareer() {
    const result: CareerResult = {
      id: state.value.id,
      playerName: state.value.playerName || "Rookie",
      region: state.value.region!,
      country: state.value.country!,
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

  const currentEvent = computed(() => {
    if (!state.value.currentEventId) return null;
    return getEventById(state.value.currentEventId) ?? null;
  });

  const lastSplit = computed<CareerSplitRecord | null>(
    () => state.value.currentSplits[state.value.currentSplits.length - 1] ?? null,
  );

  return {
    state,
    hydrated,
    currentEvent,
    currentTeamName,
    worldRankings,
    seasonPoints,
    qualifiedForWorlds,
    lastSplit,
    hydrate,
    persist,
    resetCareer,
    setOnboardingStep,
    setPlayerName,
    setRegion,
    setCountry,
    setRole,
    setBackground,
    completeOnboarding,
    startSeason,
    resolveEventChoice,
    continueAfterResult,
    acceptOffer,
    stayWithTeam,
  };
}
