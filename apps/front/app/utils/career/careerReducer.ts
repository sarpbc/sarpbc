import { getEventById, pickRandomEvent } from "~/data/career/events";
import { getWorldTeamById } from "~/data/career/world";
import { applyStatDelta, getAgeDecline, getStartingStats } from "~/utils/career/stats";
import { resolveEventOutcome, buildEventOutcomeContext } from "~/utils/career/eventOutcome";
import { createCareerWorld, moveUserToTeam, tickNpcRatings } from "~/utils/career/roster";
import {
  computeCircuitPoints,
  computeWorldRankings,
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
  applyDestinyLeanings,
  emptyDestinyLeanings,
  getRecommendedDestiny,
  getRetiredAge,
  getSeasonsPastPeak,
  getSplitNumber,
  SPLITS_PER_SEASON,
} from "~/types/career";

const OFFSEASON_DESTINY_CHOICES = {
  quit: { quit: 2 },
  streamer: { streamer: 2 },
  coach: { coach: 2 },
} as const satisfies Record<string, Partial<CareerDestinyLeanings>>;

type OffseasonDestinyChoiceId = keyof typeof OFFSEASON_DESTINY_CHOICES;

export type CareerAction =
  | { type: "START_ONBOARDING" }
  | { type: "CONTINUE_FROM_MENU" }
  | { type: "SET_ONBOARDING_STEP"; step: OnboardingStep }
  | { type: "SET_PLAYER_NAME"; name: string }
  | { type: "SET_REGION"; region: CareerRegion }
  | { type: "SET_COUNTRY"; country: CareerCountry }
  | { type: "SET_ROLE"; role: CareerRole }
  | { type: "SET_BACKGROUND"; background: CareerBackground }
  | { type: "COMPLETE_ONBOARDING" }
  | { type: "START_SEASON" }
  | { type: "RESOLVE_EVENT_CHOICE"; choiceId: string }
  | { type: "CONTINUE_AFTER_EVENT_OUTCOME" }
  | { type: "CONTINUE_AFTER_STAGE_RESULT" }
  | { type: "RESOLVE_OFFSEASON_DESTINY"; choiceId: string }
  | { type: "ACCEPT_OFFER"; teamId: string }
  | { type: "STAY_WITH_TEAM" }
  | { type: "RETIRE_CAREER" }
  | { type: "RETURN_TO_MENU" };

export type CareerReduceResult = {
  state: CareerState;
  finishedResult: CareerResult | null;
};

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}

export function createInitialCareerState(): CareerState {
  const id = crypto.randomUUID();
  return {
    id,
    phase: "menu",
    resumePhase: null,
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
    world: createCareerWorld(id),
    usedEventIds: [],
    currentEventId: null,
    eventsQueuedForStage: 0,
    eventsResolvedForStage: 0,
    pendingSkipRegionals: 0,
    pendingSkipMajor: false,
    currentSplits: [],
    currentWorlds: null,
    seasonRecords: [],
    pendingOfferTeamIds: [],
    renewalOffered: false,
    isLastChanceOffer: false,
    offseasonDestinyPending: false,
    destinyLeanings: emptyDestinyLeanings(),
    lastEventOutcome: null,
    result: null,
  };
}

function playerCircuitInput(state: CareerState) {
  const previousSeasonPoints = state.seasonRecords[state.seasonRecords.length - 1]?.points ?? null;
  return {
    name: state.playerName || "Rookie",
    teamId: state.currentTeamId || null,
    rating: state.stats.rating,
    region: state.region,
    season: state.currentSeason,
    splits: state.currentSplits,
    worlds: state.currentWorlds,
    previousPoints: previousSeasonPoints,
  };
}

function rankingsFor(state: CareerState) {
  return computeWorldRankings(state.id, playerCircuitInput(state), state.world);
}

function currentTeamName(state: CareerState): string {
  return getWorldTeamById(state.currentTeamId)?.name ?? state.currentTeamId;
}

function fieldPlayer(state: CareerState, skip: { skipRegionals: number; skipMajor: boolean }) {
  if (!state.role) throw new Error("Career role required for simulation");
  return {
    teamId: state.currentTeamId,
    rating: state.stats.rating,
    stats: state.stats,
    role: state.role,
    skipRegionals: skip.skipRegionals,
    skipMajor: skip.skipMajor,
  };
}

function pickNextEvent(state: CareerState): CareerState {
  const pool = state.currentStage === "worlds" ? "worlds" : "split";
  const seed = hashString(
    `${state.id}:event:${state.currentSeason}:${state.currentStage}:${state.eventsResolvedForStage}`,
  );
  const event = pickRandomEvent(pool, state.usedEventIds, seed, state.currentSeason);
  return {
    ...state,
    currentEventId: event.id,
    usedEventIds: [...state.usedEventIds, event.id],
    lastEventOutcome: null,
    phase: "event",
  };
}

function startStageEvents(state: CareerState): CareerState {
  const next = {
    ...state,
    eventsQueuedForStage: getEventsBeforeStage(state.id, state.currentSeason, state.currentStage),
    eventsResolvedForStage: 0,
    pendingSkipRegionals: 0,
    pendingSkipMajor: false,
  };
  return pickNextEvent(next);
}

function runStageSimulation(
  state: CareerState,
  skip: { skipRegionals: number; skipMajor: boolean },
): CareerState {
  const stage = state.currentStage;
  let next = { ...state };

  switch (stage) {
    case "split1":
    case "split2": {
      const split = getSplitNumber(stage) ?? 1;
      const player = fieldPlayer(next, skip);
      const field = simulateSplitField(next.id, next.currentSeason, split, next.world, player);
      const sim = field.get(next.currentTeamId) ?? {
        regionals: [],
        major: null,
        points: 0,
      };
      next = {
        ...next,
        stats: applyStatDelta(next.stats, getSplitFeedback(sim)),
        currentSplits: [
          ...next.currentSplits,
          {
            split,
            regionals: sim.regionals,
            major: sim.major,
            points: sim.points,
          } satisfies CareerSplitRecord,
        ],
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
      const ranking = rankingsFor(next);
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
        stats: applyStatDelta(next.stats, getWorldsFeedback(placement)),
        currentWorlds: placement,
      };
      break;
    }
    default:
      assertNever(stage);
  }

  return {
    ...next,
    world: tickNpcRatings(next.world, next.id, next.currentSeason, stage),
    phase: "stage_result",
  };
}

function endSeason(state: CareerState): CareerState {
  const worlds = state.currentWorlds;
  const record: CareerSeasonRecord = {
    season: state.currentSeason,
    teamId: state.currentTeamId,
    teamName: currentTeamName(state),
    splits: [...state.currentSplits],
    worlds,
    points: computeCircuitPoints(state.currentSplits),
    ratingEnd: state.stats.rating,
  };
  const rankings = rankingsFor({ ...state, seasonRecords: [...state.seasonRecords, record] });
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
    seasonRecords: [...state.seasonRecords, record],
    world: {
      ...state.world,
      rankSnapshot: snapshotWorldRanking(rankings),
    },
    pendingOfferTeamIds:
      resolution.transferTeamIds.length > 0
        ? resolution.transferTeamIds
        : resolution.lastChanceTeamId
          ? [resolution.lastChanceTeamId]
          : [],
    renewalOffered: resolution.renewalOffered,
    isLastChanceOffer:
      resolution.transferTeamIds.length === 0 && resolution.lastChanceTeamId !== null,
    offseasonDestinyPending: getSeasonsPastPeak(state.currentSeason + 1) > 0,
    phase: "offseason",
  };
}

function goToWorldsOrEndSeason(state: CareerState): CareerState {
  const ranking = rankingsFor(state);
  const rank = getTeamRank(ranking, state.currentTeamId);
  const qualified =
    state.currentSplits.length >= SPLITS_PER_SEASON &&
    rank != null &&
    qualifiesForWorlds(rank, ranking.teams.length);

  if (qualified) {
    return startStageEvents({ ...state, currentStage: "worlds" });
  }
  return endSeason(state);
}

function advanceToNextSeason(state: CareerState): CareerState {
  return {
    ...state,
    currentSeason: state.currentSeason + 1,
    world: tickNpcRatings(state.world, state.id, state.currentSeason + 1, "season"),
    stats: applyStatDelta(state.stats, getAgeDecline(state.currentSeason + 1)),
    currentStage: "split1",
    currentSplits: [],
    currentWorlds: null,
    pendingOfferTeamIds: [],
    renewalOffered: false,
    isLastChanceOffer: false,
    offseasonDestinyPending: false,
    lastEventOutcome: null,
    phase: "season_intro",
    resumePhase: "season_intro",
  };
}

function finishCareer(state: CareerState, destiny: CareerDestiny): CareerReduceResult {
  if (!state.region || !state.country || !state.role || !state.background) {
    throw new Error("Cannot finish career before onboarding is complete");
  }

  const trophies = deriveTrophies(state.seasonRecords);
  const result: CareerResult = {
    id: state.id,
    playerName: state.playerName || "Rookie",
    region: state.region,
    country: state.country,
    role: state.role,
    background: state.background,
    finalRating: state.stats.rating,
    finalForm: state.stats.form,
    finalMorale: state.stats.morale,
    seasons: [...state.seasonRecords],
    trophies,
    retiredAge: getRetiredAge(state.seasonRecords.length),
    destiny,
    nicknameKey: pickCareerNickname({
      role: state.role,
      destiny,
      trophies,
      seasons: state.seasonRecords,
    }),
    completedAt: new Date().toISOString(),
  };

  return {
    state: {
      ...state,
      result,
      phase: "career_end",
      resumePhase: null,
    },
    finishedResult: result,
  };
}

export function reduceCareerState(state: CareerState, action: CareerAction): CareerReduceResult {
  switch (action.type) {
    case "START_ONBOARDING": {
      const fresh = createInitialCareerState();
      return {
        state: { ...fresh, phase: "onboarding", resumePhase: null },
        finishedResult: null,
      };
    }
    case "CONTINUE_FROM_MENU": {
      if (state.resumePhase && state.resumePhase !== "menu") {
        return {
          state: { ...state, phase: state.resumePhase, resumePhase: null },
          finishedResult: null,
        };
      }
      if (state.phase === "onboarding") {
        return { state: { ...state, resumePhase: null }, finishedResult: null };
      }
      return { state, finishedResult: null };
    }
    case "RETURN_TO_MENU":
      return {
        state: {
          ...createInitialCareerState(),
          phase: "menu",
          resumePhase: null,
        },
        finishedResult: null,
      };
    case "SET_ONBOARDING_STEP":
      return {
        state: { ...state, onboardingStep: action.step },
        finishedResult: null,
      };
    case "SET_PLAYER_NAME":
      return {
        state: { ...state, playerName: action.name.trim() },
        finishedResult: null,
      };
    case "SET_REGION":
      return {
        state: {
          ...state,
          region: action.region,
          country: state.region !== action.region ? null : state.country,
        },
        finishedResult: null,
      };
    case "SET_COUNTRY":
      return { state: { ...state, country: action.country }, finishedResult: null };
    case "SET_ROLE":
      return { state: { ...state, role: action.role }, finishedResult: null };
    case "SET_BACKGROUND":
      return { state: { ...state, background: action.background }, finishedResult: null };
    case "COMPLETE_ONBOARDING": {
      const { region, country, role, background } = state;
      if (!region || !country || !role || !background) {
        return { state, finishedResult: null };
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
        state: {
          ...state,
          stats,
          world,
          currentTeamId: teamId,
          phase: "season_intro",
          resumePhase: "season_intro",
          onboardingStep: "intro",
        },
        finishedResult: null,
      };
    }
    case "START_SEASON":
      return {
        state: startStageEvents({
          ...state,
          currentStage: "split1",
          currentSplits: [],
          currentWorlds: null,
        }),
        finishedResult: null,
      };
    case "RESOLVE_EVENT_CHOICE": {
      const eventId = state.currentEventId;
      if (!eventId) return { state, finishedResult: null };

      const event = getEventById(eventId);
      const choice = event?.choices.find((entry) => entry.id === action.choiceId);
      if (!choice) return { state, finishedResult: null };

      const before = state.stats;
      const context = buildEventOutcomeContext(state, choice);
      const resolved = resolveEventOutcome(context);
      const rng = createRng(
        hashString(`${state.id}:mythic:${eventId}:${action.choiceId}:${state.currentSeason}`),
      );
      const nextStats = applyStatDelta(before, resolved.delta, rng);
      const destiny = choice.destiny ?? {};

      return {
        state: {
          ...state,
          stats: nextStats,
          destinyLeanings: applyDestinyLeanings(state.destinyLeanings, destiny),
          lastEventOutcome: {
            eventId,
            choiceId: action.choiceId,
            delta: {
              rating: nextStats.rating - before.rating,
              form: nextStats.form - before.form,
              morale: nextStats.morale - before.morale,
            },
            destiny,
            ...(resolved.failed ? { failed: true } : {}),
          },
          phase: "event_result",
        },
        finishedResult: null,
      };
    }
    case "CONTINUE_AFTER_EVENT_OUTCOME": {
      const outcome = state.lastEventOutcome;
      const event = outcome ? getEventById(outcome.eventId) : undefined;
      const choice = event?.choices.find((entry) => entry.id === outcome?.choiceId);
      let next: CareerState = {
        ...state,
        pendingSkipRegionals: Math.max(state.pendingSkipRegionals, choice?.skipRegionals ?? 0),
        pendingSkipMajor: state.pendingSkipMajor || (choice?.skipMajor ?? false),
        eventsResolvedForStage: state.eventsResolvedForStage + 1,
        currentEventId: null,
        lastEventOutcome: null,
      };

      if (next.eventsResolvedForStage < next.eventsQueuedForStage) {
        next = pickNextEvent(next);
      } else {
        next = runStageSimulation(next, {
          skipRegionals: next.pendingSkipRegionals,
          skipMajor: next.pendingSkipMajor,
        });
        next = { ...next, pendingSkipRegionals: 0, pendingSkipMajor: false };
      }

      return { state: next, finishedResult: null };
    }
    case "CONTINUE_AFTER_STAGE_RESULT": {
      const stage = state.currentStage;
      switch (stage) {
        case "split1":
          return {
            state: startStageEvents({ ...state, currentStage: "split2" }),
            finishedResult: null,
          };
        case "split2":
          return { state: goToWorldsOrEndSeason(state), finishedResult: null };
        case "worlds":
          return { state: endSeason(state), finishedResult: null };
        default:
          assertNever(stage);
      }
    }
    case "RESOLVE_OFFSEASON_DESTINY": {
      if (!(action.choiceId in OFFSEASON_DESTINY_CHOICES)) {
        return { state, finishedResult: null };
      }
      const id = action.choiceId as OffseasonDestinyChoiceId;
      const next = {
        ...state,
        destinyLeanings: applyDestinyLeanings(state.destinyLeanings, OFFSEASON_DESTINY_CHOICES[id]),
        offseasonDestinyPending: false,
      };
      switch (id) {
        case "quit":
        case "streamer":
          return finishCareer(next, getRecommendedDestiny(next.destinyLeanings));
        case "coach":
          return { state: next, finishedResult: null };
        default:
          assertNever(id);
      }
    }
    case "ACCEPT_OFFER": {
      if (!state.pendingOfferTeamIds.includes(action.teamId)) {
        return { state, finishedResult: null };
      }
      const world = moveUserToTeam(
        state.world,
        action.teamId,
        state.currentTeamId,
        state.stats.rating,
        hashString(`${state.id}:transfer:${state.currentSeason}:${action.teamId}`),
      );
      return {
        state: advanceToNextSeason({ ...state, world, currentTeamId: action.teamId }),
        finishedResult: null,
      };
    }
    case "STAY_WITH_TEAM": {
      if (!state.renewalOffered) return { state, finishedResult: null };
      return { state: advanceToNextSeason(state), finishedResult: null };
    }
    case "RETIRE_CAREER":
      return finishCareer(state, getRecommendedDestiny(state.destinyLeanings));
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function canContinueCareer(state: CareerState): boolean {
  if (state.resumePhase && state.resumePhase !== "menu" && state.resumePhase !== "career_end") {
    return true;
  }
  if (state.phase !== "onboarding" && state.phase !== "menu") return true;
  return state.onboardingStep !== "intro" || state.playerName.length > 0 || state.region !== null;
}

export function isPlayingPhase(phase: CareerPhase): boolean {
  return phase !== "menu" && phase !== "onboarding" && phase !== "career_end";
}

export function showCareerStats(phase: CareerPhase): boolean {
  return isPlayingPhase(phase);
}
