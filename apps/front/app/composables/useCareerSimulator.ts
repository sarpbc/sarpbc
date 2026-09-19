import { getEventById } from "~/data/career/events";
import { getWorldTeamById } from "~/data/career/world";
import {
  clearActiveCareer,
  loadActiveCareer,
  saveActiveCareer,
  saveCareerResult,
} from "~/composables/useCareerStorage";
import {
  type CareerAction,
  canContinueCareer,
  createInitialCareerState,
  reduceCareerState,
} from "~/utils/career/careerReducer";
import {
  computeSeasonPoints,
  computeWorldRankings,
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

export function useCareerSimulator() {
  const state = ref(createInitialCareerState());
  const hydrated = ref(false);

  function dispatch(action: CareerAction) {
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
  }

  function hydrate() {
    const stored = loadActiveCareer();
    state.value = stored ?? createInitialCareerState();
    hydrated.value = true;
  }

  function resetCareer() {
    clearActiveCareer();
    state.value = createInitialCareerState();
  }

  const previousSeasonPoints = computed(
    () => state.value.seasonRecords[state.value.seasonRecords.length - 1]?.points ?? null,
  );

  const worldRankings = computed(() =>
    computeWorldRankings(
      state.value.id,
      {
        name: state.value.playerName || "Rookie",
        teamId: state.value.currentTeamId || null,
        rating: state.value.stats.rating,
        region: state.value.region,
        season: state.value.currentSeason,
        splits: state.value.currentSplits,
        worlds: state.value.currentWorlds,
        previousPoints: previousSeasonPoints.value,
      },
      state.value.world,
    ),
  );

  const currentTeamName = computed(
    () => getWorldTeamById(state.value.currentTeamId)?.name ?? state.value.currentTeamId,
  );

  const seasonPoints = computed(() => computeSeasonPoints(state.value.currentSplits));

  const qualifiedForWorlds = computed(() => {
    if (state.value.currentSplits.length < SPLITS_PER_SEASON) return false;
    const rank = getTeamRank(worldRankings.value, state.value.currentTeamId);
    if (rank == null) return false;
    return qualifiesForWorlds(rank, worldRankings.value.teams.length);
  });

  const currentEvent = computed(() => {
    if (!state.value.currentEventId) return null;
    return getEventById(state.value.currentEventId) ?? null;
  });

  const lastSplit = computed<CareerSplitRecord | null>(
    () => state.value.currentSplits[state.value.currentSplits.length - 1] ?? null,
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
    if (!canContinue.value) return "";
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
      teamId,
      name: getWorldTeamById(teamId)?.name ?? teamId,
      rank: getTeamRank(worldRankings.value, teamId),
    })),
  );

  const api = {
    state,
    hydrated,
    currentEvent,
    currentTeamName,
    worldRankings,
    seasonPoints,
    qualifiedForWorlds,
    lastSplit,
    playerAge,
    destinyPromptPending,
    canRetire,
    canContinue,
    continueName,
    currentTeamRank,
    currentTeamRegion,
    offseasonOffers,
    hydrate,
    resetCareer,
    dispatch,
    setOnboardingStep: (step: OnboardingStep) => dispatch({ type: "SET_ONBOARDING_STEP", step }),
    setPlayerName: (name: string) => dispatch({ type: "SET_PLAYER_NAME", name }),
    setRegion: (region: CareerRegion) => dispatch({ type: "SET_REGION", region }),
    setCountry: (country: CareerCountry) => dispatch({ type: "SET_COUNTRY", country }),
    setRole: (role: CareerRole) => dispatch({ type: "SET_ROLE", role }),
    setBackground: (background: CareerBackground) =>
      dispatch({ type: "SET_BACKGROUND", background }),
    completeOnboarding: () => dispatch({ type: "COMPLETE_ONBOARDING" }),
    startSeason: () => dispatch({ type: "START_SEASON" }),
    resolveEventChoice: (choiceId: string) => dispatch({ type: "RESOLVE_EVENT_CHOICE", choiceId }),
    continueAfterEventOutcome: () => dispatch({ type: "CONTINUE_AFTER_EVENT_OUTCOME" }),
    continueAfterResult: () => dispatch({ type: "CONTINUE_AFTER_STAGE_RESULT" }),
    resolveOffseasonDestiny: (choiceId: string) =>
      dispatch({ type: "RESOLVE_OFFSEASON_DESTINY", choiceId }),
    acceptOffer: (teamId: string) => dispatch({ type: "ACCEPT_OFFER", teamId }),
    stayWithTeam: () => dispatch({ type: "STAY_WITH_TEAM" }),
    retireCareer: () => dispatch({ type: "RETIRE_CAREER" }),
    startOnboarding: () => dispatch({ type: "START_ONBOARDING" }),
    continueFromMenu: () => dispatch({ type: "CONTINUE_FROM_MENU" }),
    returnToMenu: () => dispatch({ type: "RETURN_TO_MENU" }),
  };

  provide(careerSimulatorKey, api);
  return api;
}

export function useCareerSimulatorContext() {
  const context = inject<ReturnType<typeof useCareerSimulator>>(careerSimulatorKey);
  if (!context) throw new Error("useCareerSimulatorContext requires useCareerSimulator parent");
  return context;
}
