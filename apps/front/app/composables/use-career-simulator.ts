import { isNonEmptyString } from "@sarpbc/utils";
import { getEventById } from "~/data/career/events";
import { getWorldTeamById } from "~/data/career/world";
import {
  clearActiveCareer,
  loadActiveCareer,
  saveActiveCareer,
  saveCareerResult,
} from "~/composables/use-career-storage";
import {
  canContinueCareer,
  createInitialCareerState,
  reduceCareerState,
} from "~/utils/career/career-reducer";
import type { CareerAction } from "~/utils/career/career-reducer";
import type { WorldRankings } from "~/utils/career/rankings";
import {
  computeSeasonPoints,
  computeStateRankings,
  getTeamRank,
  qualifiesForWorlds,
} from "~/utils/career/simulation";
import type {
  CareerBackground,
  CareerCountry,
  CareerRegion,
  CareerRole,
  CareerSplitRecord,
  OnboardingStep,
} from "~/types/career";
import { getPlayerAge, getSeasonsPastPeak, SPLITS_PER_SEASON } from "~/types/career";

const careerSimulatorKey = Symbol("careerSimulator");

const sameRankings = (a: WorldRankings, b: WorldRankings) =>
  JSON.stringify(a) === JSON.stringify(b);

export const useCareerSimulator = () => {
  // WARNING: the reducer returns a new state on every action and never mutates it, so deep reactivity would only add proxy work to each tap.
  const state = shallowRef(createInitialCareerState());
  const hydrated = ref(false);

  const dispatch = (action: CareerAction) => {
    const { state: next, finishedResult } = reduceCareerState(state.value, action);
    state.value = next;

    if (finishedResult) {
      saveCareerResult(finishedResult);
      clearActiveCareer();

      return;
    }

    if (next.phase !== "career_end") {
      saveActiveCareer(next);
    }
  };

  const hydrate = () => {
    const stored = loadActiveCareer();
    state.value = stored ?? createInitialCareerState();
    hydrated.value = true;
  };

  const resetCareer = () => {
    clearActiveCareer();
    state.value = createInitialCareerState();
  };

  const worldRankings = computed((previous?: WorldRankings) => {
    const next = computeStateRankings(state.value);

    return previous && sameRankings(previous, next) ? previous : next;
  });

  const currentTeamName = computed(
    () => getWorldTeamById(state.value.currentTeamId)?.name ?? state.value.currentTeamId,
  );

  const seasonPoints = computed(() => computeSeasonPoints(state.value.currentSplits));

  const qualifiedForWorlds = computed(() => {
    if (state.value.currentSplits.length < SPLITS_PER_SEASON) {
      return false;
    }

    const rank = getTeamRank(worldRankings.value, state.value.currentTeamId);

    if (rank === null || rank === undefined) {
      return false;
    }

    return qualifiesForWorlds(rank, worldRankings.value.teams.length);
  });

  const currentEvent = computed(() => {
    if (!isNonEmptyString(state.value.currentEventId)) {
      return null;
    }

    return getEventById(state.value.currentEventId) ?? null;
  });

  const lastSplit = computed<CareerSplitRecord | null>(
    () => state.value.currentSplits.at(-1) ?? null,
  );

  const playerAge = computed(() => getPlayerAge(state.value.currentSeason));

  const destinyPromptPending = computed(
    () =>
      state.value.offseasonDestinyPending && getSeasonsPastPeak(state.value.currentSeason + 1) > 0,
  );

  const canRetire = computed(
    () =>
      getSeasonsPastPeak(state.value.currentSeason + 1) > 0 ||
      !state.value.renewalOffered ||
      state.value.isLastChanceOffer,
  );

  const canContinue = computed(() => canContinueCareer(state.value));

  const continueName = computed(() => {
    if (!canContinue.value) {
      return "";
    }

    if (state.value.playerName && currentTeamName.value) {
      return `${state.value.playerName} · ${currentTeamName.value}`;
    }

    return state.value.playerName;
  });

  const currentTeamRank = computed(() =>
    state.value.currentTeamId ? getTeamRank(worldRankings.value, state.value.currentTeamId) : null,
  );

  const currentTeamRegion = computed(
    () => getWorldTeamById(state.value.currentTeamId)?.region ?? state.value.region,
  );

  const offseasonOffers = computed(() =>
    state.value.pendingOfferTeamIds.map((teamId) => ({
      name: getWorldTeamById(teamId)?.name ?? teamId,
      rank: getTeamRank(worldRankings.value, teamId),
      teamId,
    })),
  );

  const api = {
    acceptOffer: (teamId: string) => {
      dispatch({ teamId, type: "ACCEPT_OFFER" });
    },
    canContinue,
    canRetire,
    completeOnboarding: () => {
      dispatch({ type: "COMPLETE_ONBOARDING" });
    },
    continueAfterEventOutcome: () => {
      dispatch({ type: "CONTINUE_AFTER_EVENT_OUTCOME" });
    },
    continueAfterResult: () => {
      dispatch({ type: "CONTINUE_AFTER_STAGE_RESULT" });
    },
    continueFromMenu: () => {
      dispatch({ type: "CONTINUE_FROM_MENU" });
    },
    continueName,
    currentEvent,
    currentTeamName,
    currentTeamRank,
    currentTeamRegion,
    destinyPromptPending,
    dispatch,
    hydrate,
    hydrated,
    lastSplit,
    offseasonOffers,
    playerAge,
    qualifiedForWorlds,
    resetCareer,
    resolveEventChoice: (choiceId: string) => {
      dispatch({ choiceId, type: "RESOLVE_EVENT_CHOICE" });
    },
    resolveOffseasonDestiny: (choiceId: string) => {
      dispatch({ choiceId, type: "RESOLVE_OFFSEASON_DESTINY" });
    },
    retireCareer: () => {
      dispatch({ type: "RETIRE_CAREER" });
    },
    returnToMenu: () => {
      dispatch({ type: "RETURN_TO_MENU" });
    },
    seasonPoints,
    setBackground: (background: CareerBackground) => {
      dispatch({ background, type: "SET_BACKGROUND" });
    },
    setCountry: (country: CareerCountry) => {
      dispatch({ country, type: "SET_COUNTRY" });
    },
    setOnboardingStep: (step: OnboardingStep) => {
      dispatch({ step, type: "SET_ONBOARDING_STEP" });
    },
    setPlayerName: (name: string) => {
      dispatch({ name, type: "SET_PLAYER_NAME" });
    },
    setRegion: (region: CareerRegion) => {
      dispatch({ region, type: "SET_REGION" });
    },
    setRole: (role: CareerRole) => {
      dispatch({ role, type: "SET_ROLE" });
    },
    startOnboarding: () => {
      dispatch({ type: "START_ONBOARDING" });
    },
    startSeason: () => {
      dispatch({ type: "START_SEASON" });
    },
    state,
    stayWithTeam: () => {
      dispatch({ type: "STAY_WITH_TEAM" });
    },
    worldRankings,
  };

  provide(careerSimulatorKey, api);

  return api;
};

export const useCareerSimulatorContext = () => {
  const context = inject<ReturnType<typeof useCareerSimulator>>(careerSimulatorKey);

  if (!context) {
    throw new Error("useCareerSimulatorContext requires useCareerSimulator parent");
  }

  return context;
};
