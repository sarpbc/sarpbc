import { isNonEmptyString } from "@sarpbc/utils";
import { getEventById, pickRandomEvent } from "~/data/career/events";
import { getWorldTeamById } from "~/data/career/world";
import { applyStatDelta, getAgeDecline, getStartingStats } from "~/utils/career/stats";
import { resolveEventOutcome, buildEventOutcomeContext } from "~/utils/career/event-outcome";
import { createCareerWorld, moveUserToTeam, tickNpcRatings } from "~/utils/career/roster";
import {
  computeCircuitPoints,
  computeStateRankings,
  createRng,
  deriveTrophies,
  getSplitFeedback,
  getEventsBeforeStage,
  getTeamRank,
  getWorldsFeedback,
  hashString,
  pickStartingTeam,
  qualifiesForWorlds,
  resolveOffseasonContracts,
  simulateSplitField,
  simulateWorldsField,
  snapshotWorldRanking,
  splitFieldToResult,
  upsertSplitField,
} from "~/utils/career/simulation";
import { pickCareerNickname } from "~/utils/career/nickname";
import type {
  CareerBackground,
  CareerCountry,
  CareerDestiny,
  CareerDestinyLeanings,
  CareerEventOutcome,
  CareerPhase,
  CareerRegion,
  CareerResult,
  CareerRole,
  CareerSeasonRecord,
  CareerSplitRecord,
  CareerState,
  OnboardingStep,
} from "~/types/career";
import {
  DEFAULT_PLAYER_NAME,
  applyDestinyLeanings,
  emptyDestinyLeanings,
  getRecommendedDestiny,
  getRetiredAge,
  getSeasonsPastPeak,
  getSplitNumber,
  SPLITS_PER_SEASON,
} from "~/types/career";

const OFFSEASON_DESTINY_CHOICES = {
  coach: { coach: 2 },
  quit: { quit: 2 },
  streamer: { streamer: 2 },
} as const satisfies Record<string, Partial<CareerDestinyLeanings>>;

type OffseasonDestinyChoiceId = keyof typeof OFFSEASON_DESTINY_CHOICES;

const isOffseasonDestinyChoiceId = (id: string): id is OffseasonDestinyChoiceId =>
  Object.hasOwn(OFFSEASON_DESTINY_CHOICES, id);

type OnboardingAction =
  | { type: "START_ONBOARDING" }
  | { type: "CONTINUE_FROM_MENU" }
  | { type: "SET_ONBOARDING_STEP"; step: OnboardingStep }
  | { type: "SET_PLAYER_NAME"; name: string }
  | { type: "SET_REGION"; region: CareerRegion }
  | { type: "SET_COUNTRY"; country: CareerCountry }
  | { type: "SET_ROLE"; role: CareerRole }
  | { type: "SET_BACKGROUND"; background: CareerBackground }
  | { type: "COMPLETE_ONBOARDING" }
  | { type: "RETURN_TO_MENU" };

type SeasonAction =
  | { type: "START_SEASON" }
  | { type: "RESOLVE_EVENT_CHOICE"; choiceId: string }
  | { type: "CONTINUE_AFTER_EVENT_OUTCOME" }
  | { type: "CONTINUE_AFTER_STAGE_RESULT" }
  | { type: "RESOLVE_OFFSEASON_DESTINY"; choiceId: string }
  | { type: "ACCEPT_OFFER"; teamId: string }
  | { type: "STAY_WITH_TEAM" }
  | { type: "RETIRE_CAREER" };

export type CareerAction = OnboardingAction | SeasonAction;

export interface CareerReduceResult {
  state: CareerState;
  finishedResult: CareerResult | null;
}

const assertNever = (value: never): never => {
  throw new Error(`Unexpected value: ${String(value)}`);
};

export const createInitialCareerState = (): CareerState => {
  const id = crypto.randomUUID();

  return {
    background: null,
    country: null,
    currentEventId: null,
    currentSeason: 1,
    currentSplits: [],
    currentStage: "split1",
    currentTeamId: "",
    currentWorlds: null,
    destinyLeanings: emptyDestinyLeanings(),
    eventsQueuedForStage: 0,
    eventsResolvedForStage: 0,
    id,
    isLastChanceOffer: false,
    lastEventOutcome: null,
    offseasonDestinyPending: false,
    onboardingStep: "intro",
    pendingOfferTeamIds: [],
    pendingSkipMajor: false,
    pendingSkipRegionals: 0,
    phase: "menu",
    playerName: "",
    region: null,
    renewalOffered: false,
    result: null,
    resumePhase: null,
    role: null,
    seasonRecords: [],
    stats: { form: 60, morale: 60, rating: 60 },
    usedEventIds: [],
    world: createCareerWorld(id),
  };
};

const currentTeamName = (state: CareerState): string =>
  getWorldTeamById(state.currentTeamId)?.name ?? state.currentTeamId;

const fieldPlayer = (state: CareerState, skip: { skipRegionals: number; skipMajor: boolean }) => {
  if (!state.role) {
    throw new Error("Career role required for simulation");
  }

  return {
    rating: state.stats.rating,
    role: state.role,
    skipMajor: skip.skipMajor,
    skipRegionals: skip.skipRegionals,
    stats: state.stats,
    teamId: state.currentTeamId,
  };
};

const pickNextEvent = (state: CareerState): CareerState => {
  const pool = state.currentStage === "worlds" ? "worlds" : "split";

  const seed = hashString(
    `${state.id}:event:${state.currentSeason}:${state.currentStage}:${state.eventsResolvedForStage}`,
  );

  const event = pickRandomEvent(pool, state.usedEventIds, seed, state.currentSeason);

  return {
    ...state,
    currentEventId: event.id,
    lastEventOutcome: null,
    phase: "event",
    usedEventIds: [...state.usedEventIds, event.id],
  };
};

const startStageEvents = (state: CareerState): CareerState => {
  const next = {
    ...state,
    eventsQueuedForStage: getEventsBeforeStage(state.id, state.currentSeason, state.currentStage),
    eventsResolvedForStage: 0,
    pendingSkipMajor: false,
    pendingSkipRegionals: 0,
  };

  return pickNextEvent(next);
};

const runStageSimulation = (
  state: CareerState,
  skip: { skipRegionals: number; skipMajor: boolean },
): CareerState => {
  const stage = state.currentStage;
  let next = { ...state };

  switch (stage) {
    case "split1":
    case "split2": {
      const split = getSplitNumber(stage) ?? 1;
      const player = fieldPlayer(next, skip);
      const field = simulateSplitField(next.id, next.currentSeason, split, next.world, player);

      const sim = field.get(next.currentTeamId) ?? {
        major: null,
        points: 0,
        regionals: [],
      };

      next = {
        ...next,
        currentSplits: [
          ...next.currentSplits,
          {
            major: sim.major,
            points: sim.points,
            regionals: sim.regionals,
            split,
          } satisfies CareerSplitRecord,
        ],
        stats: applyStatDelta(next.stats, getSplitFeedback(sim)),
        world: {
          ...next.world,
          splitFields: upsertSplitField(
            next.world.splitFields,
            splitFieldToResult(next.currentSeason, split, field),
          ),
        },
      };
      break;
    }

    case "worlds": {
      const player = fieldPlayer(next, skip);
      const ranking = computeStateRankings(next);

      const qualified = ranking.teams
        .filter((entry) => qualifiesForWorlds(entry.rank, ranking.teams.length))
        .map((entry) => entry.team.id);

      const placements = simulateWorldsField(
        next.id,
        next.currentSeason,
        next.world,
        qualified,
        player,
      );

      const placement = placements.get(next.currentTeamId) ?? "group";
      next = {
        ...next,
        currentWorlds: placement,
        stats: applyStatDelta(next.stats, getWorldsFeedback(placement)),
      };
      break;
    }

    default: {
      assertNever(stage);
    }
  }

  return {
    ...next,
    phase: "stage_result",
    world: tickNpcRatings(next.world, next.id, next.currentSeason, stage),
  };
};

const pendingOfferTeamIds = (
  transferTeamIds: string[],
  lastChanceTeamId: string | null,
): string[] => {
  if (transferTeamIds.length > 0) {
    return transferTeamIds;
  }

  return isNonEmptyString(lastChanceTeamId) ? [lastChanceTeamId] : [];
};

const endSeason = (state: CareerState): CareerState => {
  const worlds = state.currentWorlds;

  const record: CareerSeasonRecord = {
    points: computeCircuitPoints(state.currentSplits),
    ratingEnd: state.stats.rating,
    season: state.currentSeason,
    splits: [...state.currentSplits],
    teamId: state.currentTeamId,
    teamName: currentTeamName(state),
    worlds,
  };

  const rankings = computeStateRankings({
    ...state,
    seasonRecords: [...state.seasonRecords, record],
  });

  const offerSeed = hashString(`${state.id}:offer:${state.currentSeason}`);

  const resolution = resolveOffseasonContracts(
    state.currentSeason,
    record.points,
    state.currentTeamId,
    rankings,
    offerSeed,
  );

  return {
    ...state,
    isLastChanceOffer:
      resolution.transferTeamIds.length === 0 && resolution.lastChanceTeamId !== null,
    offseasonDestinyPending: getSeasonsPastPeak(state.currentSeason + 1) > 0,
    pendingOfferTeamIds: pendingOfferTeamIds(
      resolution.transferTeamIds,
      resolution.lastChanceTeamId,
    ),
    phase: "offseason",
    renewalOffered: resolution.renewalOffered,
    seasonRecords: [...state.seasonRecords, record],
    world: {
      ...state.world,
      rankSnapshot: snapshotWorldRanking(rankings),
    },
  };
};

const goToWorldsOrEndSeason = (state: CareerState): CareerState => {
  const ranking = computeStateRankings(state);
  const rank = getTeamRank(ranking, state.currentTeamId);

  const qualified =
    state.currentSplits.length >= SPLITS_PER_SEASON &&
    rank !== null &&
    rank !== undefined &&
    qualifiesForWorlds(rank, ranking.teams.length);

  if (qualified) {
    return startStageEvents({ ...state, currentStage: "worlds" });
  }

  return endSeason(state);
};

const advanceToNextSeason = (state: CareerState): CareerState => ({
  ...state,
  currentSeason: state.currentSeason + 1,
  currentSplits: [],
  currentStage: "split1",
  currentWorlds: null,
  isLastChanceOffer: false,
  lastEventOutcome: null,
  offseasonDestinyPending: false,
  pendingOfferTeamIds: [],
  phase: "season_intro",
  renewalOffered: false,
  resumePhase: "season_intro",
  stats: applyStatDelta(state.stats, getAgeDecline(state.currentSeason + 1)),
  world: tickNpcRatings(state.world, state.id, state.currentSeason + 1, "season"),
});

const finishCareer = (state: CareerState, destiny: CareerDestiny): CareerReduceResult => {
  if (!state.region || !state.country || !state.role || !state.background) {
    throw new Error("Cannot finish career before onboarding is complete");
  }

  const trophies = deriveTrophies(state.seasonRecords);

  const result: CareerResult = {
    background: state.background,
    completedAt: new Date().toISOString(),
    country: state.country,
    destiny,
    finalForm: state.stats.form,
    finalMorale: state.stats.morale,
    finalRating: state.stats.rating,
    id: state.id,
    nicknameKey: pickCareerNickname({
      destiny,
      role: state.role,
      seasons: state.seasonRecords,
      trophies,
    }),
    playerName: state.playerName || DEFAULT_PLAYER_NAME,
    region: state.region,
    retiredAge: getRetiredAge(state.seasonRecords.length),
    role: state.role,
    seasons: [...state.seasonRecords],
    trophies,
  };

  return {
    finishedResult: result,
    state: {
      ...state,
      phase: "career_end",
      result,
      resumePhase: null,
    },
  };
};

const unchanged = (state: CareerState): CareerReduceResult => ({ finishedResult: null, state });

const completeOnboarding = (state: CareerState): CareerReduceResult => {
  const { region, country, role, background } = state;

  if (!region || !country || !role || !background) {
    return unchanged(state);
  }

  const stats = getStartingStats(background, role);
  const teamId = pickStartingTeam(region);

  const world = moveUserToTeam(
    state.world,
    teamId,
    null,
    stats.rating,
    hashString(`${state.id}:start`),
  );

  return {
    finishedResult: null,
    state: {
      ...state,
      currentTeamId: teamId,
      onboardingStep: "intro",
      phase: "season_intro",
      resumePhase: "season_intro",
      stats,
      world,
    },
  };
};

const continueFromMenu = (state: CareerState): CareerReduceResult => {
  if (state.resumePhase && state.resumePhase !== "menu") {
    return {
      finishedResult: null,
      state: { ...state, phase: state.resumePhase, resumePhase: null },
    };
  }

  if (state.phase === "onboarding") {
    return { finishedResult: null, state: { ...state, resumePhase: null } };
  }

  return unchanged(state);
};

const reduceOnboarding = (state: CareerState, action: OnboardingAction): CareerReduceResult => {
  switch (action.type) {
    case "START_ONBOARDING": {
      const fresh = createInitialCareerState();

      return {
        finishedResult: null,
        state: { ...fresh, phase: "onboarding", resumePhase: null },
      };
    }

    case "CONTINUE_FROM_MENU": {
      return continueFromMenu(state);
    }

    case "RETURN_TO_MENU": {
      return {
        finishedResult: null,
        state: {
          ...createInitialCareerState(),
          phase: "menu",
          resumePhase: null,
        },
      };
    }

    case "SET_ONBOARDING_STEP": {
      return {
        finishedResult: null,
        state: { ...state, onboardingStep: action.step },
      };
    }

    case "SET_PLAYER_NAME": {
      return {
        finishedResult: null,
        state: { ...state, playerName: action.name.trim() },
      };
    }

    case "SET_REGION": {
      return {
        finishedResult: null,
        state: {
          ...state,
          country: state.region === action.region ? state.country : null,
          region: action.region,
        },
      };
    }

    case "SET_COUNTRY": {
      return { finishedResult: null, state: { ...state, country: action.country } };
    }

    case "SET_ROLE": {
      return { finishedResult: null, state: { ...state, role: action.role } };
    }

    case "SET_BACKGROUND": {
      return { finishedResult: null, state: { ...state, background: action.background } };
    }

    case "COMPLETE_ONBOARDING": {
      return completeOnboarding(state);
    }

    default: {
      return assertNever(action);
    }
  }
};

const resolveEventChoice = (state: CareerState, choiceId: string): CareerReduceResult => {
  const eventId = state.currentEventId;

  if (!isNonEmptyString(eventId)) {
    return unchanged(state);
  }

  const event = getEventById(eventId);
  const choice = event?.choices.find((entry) => entry.id === choiceId);

  if (!choice) {
    return unchanged(state);
  }

  const before = state.stats;
  const context = buildEventOutcomeContext(state, choice);
  const resolved = resolveEventOutcome(context);

  const rng = createRng(
    hashString(`${state.id}:mythic:${eventId}:${choiceId}:${state.currentSeason}`),
  );

  const nextStats = applyStatDelta(before, resolved.delta, rng);
  const destiny = choice.destiny ?? {};

  const lastEventOutcome: CareerEventOutcome = {
    choiceId,
    delta: {
      form: nextStats.form - before.form,
      morale: nextStats.morale - before.morale,
      rating: nextStats.rating - before.rating,
    },
    destiny,
    eventId,
  };

  if (resolved.failed) {
    lastEventOutcome.failed = true;
  }

  return {
    finishedResult: null,
    state: {
      ...state,
      destinyLeanings: applyDestinyLeanings(state.destinyLeanings, destiny),
      lastEventOutcome,
      phase: "event_result",
      stats: nextStats,
    },
  };
};

const continueAfterEventOutcome = (state: CareerState): CareerReduceResult => {
  const outcome = state.lastEventOutcome;
  const event = outcome ? getEventById(outcome.eventId) : undefined;
  const choice = event?.choices.find((entry) => entry.id === outcome?.choiceId);

  let next: CareerState = {
    ...state,
    currentEventId: null,
    eventsResolvedForStage: state.eventsResolvedForStage + 1,
    lastEventOutcome: null,
    pendingSkipMajor: state.pendingSkipMajor || (choice?.skipMajor ?? false),
    pendingSkipRegionals: Math.max(state.pendingSkipRegionals, choice?.skipRegionals ?? 0),
  };

  if (next.eventsResolvedForStage < next.eventsQueuedForStage) {
    next = pickNextEvent(next);
  } else {
    next = runStageSimulation(next, {
      skipMajor: next.pendingSkipMajor,
      skipRegionals: next.pendingSkipRegionals,
    });
    next = { ...next, pendingSkipMajor: false, pendingSkipRegionals: 0 };
  }

  return { finishedResult: null, state: next };
};

const continueAfterStageResult = (state: CareerState): CareerReduceResult => {
  const stage = state.currentStage;

  switch (stage) {
    case "split1": {
      return {
        finishedResult: null,
        state: startStageEvents({ ...state, currentStage: "split2" }),
      };
    }

    case "split2": {
      return { finishedResult: null, state: goToWorldsOrEndSeason(state) };
    }

    case "worlds": {
      return { finishedResult: null, state: endSeason(state) };
    }

    default: {
      return assertNever(stage);
    }
  }
};

const resolveOffseasonDestiny = (state: CareerState, id: string): CareerReduceResult => {
  if (!isOffseasonDestinyChoiceId(id)) {
    return unchanged(state);
  }

  const next = {
    ...state,
    destinyLeanings: applyDestinyLeanings(state.destinyLeanings, OFFSEASON_DESTINY_CHOICES[id]),
    offseasonDestinyPending: false,
  };

  switch (id) {
    case "quit":
    case "streamer": {
      return finishCareer(next, getRecommendedDestiny(next.destinyLeanings));
    }

    case "coach": {
      return { finishedResult: null, state: next };
    }

    default: {
      return assertNever(id);
    }
  }
};

const acceptOffer = (state: CareerState, teamId: string): CareerReduceResult => {
  if (!state.pendingOfferTeamIds.includes(teamId)) {
    return unchanged(state);
  }

  const world = moveUserToTeam(
    state.world,
    teamId,
    state.currentTeamId,
    state.stats.rating,
    hashString(`${state.id}:transfer:${state.currentSeason}:${teamId}`),
  );

  return {
    finishedResult: null,
    state: advanceToNextSeason({ ...state, currentTeamId: teamId, world }),
  };
};

const reduceSeason = (state: CareerState, action: SeasonAction): CareerReduceResult => {
  switch (action.type) {
    case "START_SEASON": {
      return {
        finishedResult: null,
        state: startStageEvents({
          ...state,
          currentSplits: [],
          currentStage: "split1",
          currentWorlds: null,
        }),
      };
    }

    case "RESOLVE_EVENT_CHOICE": {
      return resolveEventChoice(state, action.choiceId);
    }

    case "CONTINUE_AFTER_EVENT_OUTCOME": {
      return continueAfterEventOutcome(state);
    }

    case "CONTINUE_AFTER_STAGE_RESULT": {
      return continueAfterStageResult(state);
    }

    case "RESOLVE_OFFSEASON_DESTINY": {
      return resolveOffseasonDestiny(state, action.choiceId);
    }

    case "ACCEPT_OFFER": {
      return acceptOffer(state, action.teamId);
    }

    case "STAY_WITH_TEAM": {
      return state.renewalOffered
        ? { finishedResult: null, state: advanceToNextSeason(state) }
        : unchanged(state);
    }

    case "RETIRE_CAREER": {
      return finishCareer(state, getRecommendedDestiny(state.destinyLeanings));
    }

    default: {
      return assertNever(action);
    }
  }
};

export const reduceCareerState = (state: CareerState, action: CareerAction): CareerReduceResult => {
  switch (action.type) {
    case "START_ONBOARDING":
    case "CONTINUE_FROM_MENU":
    case "RETURN_TO_MENU":
    case "SET_ONBOARDING_STEP":
    case "SET_PLAYER_NAME":
    case "SET_REGION":
    case "SET_COUNTRY":
    case "SET_ROLE":
    case "SET_BACKGROUND":
    case "COMPLETE_ONBOARDING": {
      return reduceOnboarding(state, action);
    }

    case "START_SEASON":
    case "RESOLVE_EVENT_CHOICE":
    case "CONTINUE_AFTER_EVENT_OUTCOME":
    case "CONTINUE_AFTER_STAGE_RESULT":
    case "RESOLVE_OFFSEASON_DESTINY":
    case "ACCEPT_OFFER":
    case "STAY_WITH_TEAM":
    case "RETIRE_CAREER": {
      return reduceSeason(state, action);
    }

    default: {
      return assertNever(action);
    }
  }
};

export const canContinueCareer = (state: CareerState): boolean => {
  if (state.resumePhase && state.resumePhase !== "menu" && state.resumePhase !== "career_end") {
    return true;
  }

  if (state.phase !== "onboarding" && state.phase !== "menu") {
    return true;
  }

  return state.onboardingStep !== "intro" || state.playerName.length > 0 || state.region !== null;
};

export const isPlayingPhase = (phase: CareerPhase): boolean =>
  phase !== "menu" && phase !== "onboarding" && phase !== "career_end";

export const showCareerStats = (phase: CareerPhase): boolean => isPlayingPhase(phase);
