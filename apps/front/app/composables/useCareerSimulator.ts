import { getEventById, pickRandomEvent } from "~/data/career/events";
import { getWorldTeamById } from "~/data/career/world";
import {
  clearActiveCareer,
  loadActiveCareer,
  saveActiveCareer,
  saveCareerResult,
} from "~/composables/useCareerStorage";
import { applyStatDelta, getAgeDecline, getStartingStats } from "~/utils/career/stats";
import { WORLD_STRENGTH_BASELINE, resolveEventOutcome } from "~/utils/career/eventOutcome";
import {
  createCareerWorld,
  getRosterPlayerRating,
  getRosterStrength,
  moveUserToTeam,
  tickNpcRatings,
} from "~/utils/career/roster";
import {
  computeCircuitPoints,
  computeSeasonPoints,
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
  CareerRegion,
  CareerResult,
  CareerRole,
  CareerSeasonRecord,
  CareerSplitRecord,
  CareerState,
  OnboardingStep,
} from "~/types/career";
import {
  USER_ROSTER_ID,
  applyDestinyLeanings,
  emptyDestinyLeanings,
  getPlayerAge,
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

function createInitialState(): CareerState {
  const id = crypto.randomUUID();
  return {
    id,
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
    const teamId = pickStartingTeam(region);
    state.value.world = moveUserToTeam(
      state.value.world,
      teamId,
      null,
      state.value.stats.rating,
      hashString(`${state.value.id}:start`),
    );
    state.value.currentTeamId = teamId;
    state.value.phase = "season_intro";
    state.value.onboardingStep = "intro";
    persist();
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

  function startSeason() {
    state.value.currentStage = "split1";
    state.value.currentSplits = [];
    state.value.currentWorlds = null;
    startStageEvents();
    persist();
  }

  function startStageEvents() {
    state.value.eventsQueuedForStage = getEventsBeforeStage(
      state.value.id,
      state.value.currentSeason,
      state.value.currentStage,
    );
    state.value.eventsResolvedForStage = 0;
    state.value.pendingSkipRegionals = 0;
    state.value.pendingSkipMajor = false;
    pickNextEvent(state.value.currentStage === "worlds" ? "worlds" : "split");
  }

  function pickNextEvent(pool: "split" | "worlds") {
    const seed = hashString(
      `${state.value.id}:event:${state.value.currentSeason}:${state.value.currentStage}:${state.value.eventsResolvedForStage}`,
    );
    const event = pickRandomEvent(pool, state.value.usedEventIds, seed, state.value.currentSeason);
    state.value.currentEventId = event.id;
    state.value.usedEventIds.push(event.id);
    state.value.lastEventOutcome = null;
    state.value.phase = "event";
  }

  function resolveEventChoice(choiceId: string) {
    const eventId = state.value.currentEventId;
    if (!eventId) return;

    const event = getEventById(eventId);
    const choice = event?.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    const destiny = choice.destiny ?? {};
    const before = state.value.stats;
    const roster = state.value.world.rosters[state.value.currentTeamId];
    const lastSeason = state.value.seasonRecords[state.value.seasonRecords.length - 1];
    const lastSplit =
      state.value.currentSplits[state.value.currentSplits.length - 1] ?? lastSeason?.splits.at(-1);
    const resolved = resolveEventOutcome({
      careerId: state.value.id,
      eventId,
      choiceId,
      season: state.value.currentSeason,
      authoredDelta: choice.delta,
      teamStrength: roster
        ? getRosterStrength(roster, state.value.world, before.rating)
        : WORLD_STRENGTH_BASELINE,
      teammateRatings: roster
        ? roster
            .filter((playerId) => playerId !== USER_ROSTER_ID)
            .map((playerId) => getRosterPlayerRating(playerId, state.value.world, before.rating))
        : [],
      lastSplitPoints: lastSplit?.points ?? null,
      missedWorldsLastSeason: lastSeason ? lastSeason.worlds === null : false,
      quitLeaning: state.value.destinyLeanings.quit,
    });
    const rng = createRng(
      hashString(`${state.value.id}:mythic:${eventId}:${choiceId}:${state.value.currentSeason}`),
    );
    const next = applyStatDelta(before, resolved.delta, rng);
    state.value.stats = next;
    state.value.destinyLeanings = applyDestinyLeanings(state.value.destinyLeanings, destiny);
    state.value.lastEventOutcome = {
      eventId,
      choiceId,
      delta: {
        rating: next.rating - before.rating,
        form: next.form - before.form,
        morale: next.morale - before.morale,
      },
      destiny,
      ...(resolved.failed ? { failed: true } : {}),
    };
    state.value.phase = "event_result";
    persist();
  }

  function continueAfterEventOutcome() {
    const outcome = state.value.lastEventOutcome;
    const event = outcome ? getEventById(outcome.eventId) : undefined;
    const choice = event?.choices.find((entry) => entry.id === outcome?.choiceId);
    state.value.pendingSkipRegionals = Math.max(
      state.value.pendingSkipRegionals,
      choice?.skipRegionals ?? 0,
    );
    state.value.pendingSkipMajor = state.value.pendingSkipMajor || (choice?.skipMajor ?? false);
    state.value.eventsResolvedForStage += 1;
    state.value.currentEventId = null;
    state.value.lastEventOutcome = null;
    if (state.value.eventsResolvedForStage < state.value.eventsQueuedForStage) {
      pickNextEvent(state.value.currentStage === "worlds" ? "worlds" : "split");
    } else {
      runStageSimulation({
        skipRegionals: state.value.pendingSkipRegionals,
        skipMajor: state.value.pendingSkipMajor,
      });
      state.value.pendingSkipRegionals = 0;
      state.value.pendingSkipMajor = false;
    }
    persist();
  }

  function runStageSimulation(
    skip: { skipRegionals: number; skipMajor: boolean } = {
      skipRegionals: 0,
      skipMajor: false,
    },
  ) {
    const stage = state.value.currentStage;
    const fieldPlayer = {
      teamId: state.value.currentTeamId,
      rating: state.value.stats.rating,
      stats: state.value.stats,
      role: state.value.role,
      skipRegionals: skip.skipRegionals,
      skipMajor: skip.skipMajor,
    };

    switch (stage) {
      case "split1":
      case "split2": {
        const split = getSplitNumber(stage) ?? 1;
        const field = simulateSplitField(
          state.value.id,
          state.value.currentSeason,
          split,
          state.value.world,
          fieldPlayer,
        );
        const sim = field.get(state.value.currentTeamId) ?? {
          regionals: [],
          major: null,
          points: 0,
        };
        state.value.stats = applyStatDelta(state.value.stats, getSplitFeedback(sim));
        const record: CareerSplitRecord = {
          split,
          regionals: sim.regionals,
          major: sim.major,
          points: sim.points,
        };
        state.value.currentSplits.push(record);
        state.value.world = {
          ...state.value.world,
          splitFields: upsertSplitField(
            state.value.world.splitFields,
            splitFieldToResult(state.value.currentSeason, split, field),
          ),
        };
        break;
      }
      case "worlds": {
        const qualified = worldRankings.value.teams
          .filter((entry) => qualifiesForWorlds(entry.rank, worldRankings.value.teams.length))
          .map((entry) => entry.team.id);
        const placements = simulateWorldsField(
          state.value.id,
          state.value.currentSeason,
          state.value.world,
          qualified,
          fieldPlayer,
        );
        const placement = placements.get(state.value.currentTeamId) ?? "group";
        state.value.stats = applyStatDelta(state.value.stats, getWorldsFeedback(placement));
        state.value.currentWorlds = placement;
        break;
      }
      default:
        assertNever(stage);
    }

    state.value.world = tickNpcRatings(
      state.value.world,
      state.value.id,
      state.value.currentSeason,
      stage,
    );
    state.value.phase = "stage_result";
  }

  function goToWorldsOrEndSeason() {
    if (qualifiedForWorlds.value) {
      state.value.currentStage = "worlds";
      startStageEvents();
    } else {
      endSeason();
    }
  }

  function continueAfterResult() {
    const stage = state.value.currentStage;

    switch (stage) {
      case "split1":
        state.value.currentStage = "split2";
        startStageEvents();
        break;
      case "split2":
        goToWorldsOrEndSeason();
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
      points: computeCircuitPoints(state.value.currentSplits),
      ratingEnd: state.value.stats.rating,
    };
    state.value.seasonRecords.push(record);

    const rankings = worldRankings.value;
    state.value.world = {
      ...state.value.world,
      rankSnapshot: snapshotWorldRanking(rankings),
    };

    const offerSeed = hashString(`${state.value.id}:offer:${state.value.currentSeason}`);
    const resolution = resolveOffseasonContracts(
      state.value.currentSeason,
      record.points,
      state.value.currentTeamId,
      rankings,
      offerSeed,
    );
    state.value.pendingOfferTeamIds =
      resolution.transferTeamIds.length > 0
        ? resolution.transferTeamIds
        : resolution.lastChanceTeamId
          ? [resolution.lastChanceTeamId]
          : [];
    state.value.renewalOffered = resolution.renewalOffered;
    state.value.isLastChanceOffer =
      resolution.transferTeamIds.length === 0 && resolution.lastChanceTeamId !== null;
    state.value.offseasonDestinyPending = getSeasonsPastPeak(state.value.currentSeason + 1) > 0;
    state.value.phase = "offseason";
  }

  function resolveOffseasonDestiny(choiceId: string) {
    if (!(choiceId in OFFSEASON_DESTINY_CHOICES)) return;
    const id = choiceId as OffseasonDestinyChoiceId;
    state.value.destinyLeanings = applyDestinyLeanings(
      state.value.destinyLeanings,
      OFFSEASON_DESTINY_CHOICES[id],
    );
    state.value.offseasonDestinyPending = false;

    switch (id) {
      case "quit":
      case "streamer":
        retireCareer();
        return;
      case "coach":
        persist();
        return;
      default: {
        const _exhaustive: never = id;
        return _exhaustive;
      }
    }
  }

  function acceptOffer(teamId: string) {
    if (!state.value.pendingOfferTeamIds.includes(teamId)) return;
    state.value.world = moveUserToTeam(
      state.value.world,
      teamId,
      state.value.currentTeamId,
      state.value.stats.rating,
      hashString(`${state.value.id}:transfer:${state.value.currentSeason}:${teamId}`),
    );
    state.value.currentTeamId = teamId;
    advanceToNextSeason();
  }

  function stayWithTeam() {
    if (!state.value.renewalOffered) return;
    advanceToNextSeason();
  }

  function retireCareer() {
    finishCareer(getRecommendedDestiny(state.value.destinyLeanings));
  }

  function advanceToNextSeason() {
    state.value.currentSeason += 1;
    state.value.world = tickNpcRatings(
      state.value.world,
      state.value.id,
      state.value.currentSeason,
      "season",
    );
    state.value.stats = applyStatDelta(state.value.stats, getAgeDecline(state.value.currentSeason));
    state.value.currentStage = "split1";
    state.value.currentSplits = [];
    state.value.currentWorlds = null;
    state.value.pendingOfferTeamIds = [];
    state.value.renewalOffered = false;
    state.value.isLastChanceOffer = false;
    state.value.offseasonDestinyPending = false;
    state.value.lastEventOutcome = null;
    state.value.phase = "season_intro";
    persist();
  }

  function finishCareer(destiny: CareerDestiny) {
    const trophies = deriveTrophies(state.value.seasonRecords);
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
      trophies,
      retiredAge: getRetiredAge(state.value.seasonRecords.length),
      destiny,
      nicknameKey: pickCareerNickname({
        role: state.value.role!,
        destiny,
        trophies,
        seasons: state.value.seasonRecords,
      }),
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

  const playerAge = computed(() => getPlayerAge(state.value.currentSeason));
  const isPastPeak = computed(() => getSeasonsPastPeak(state.value.currentSeason) > 0);
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

  return {
    state,
    hydrated,
    currentEvent,
    currentTeamName,
    worldRankings,
    seasonPoints,
    qualifiedForWorlds,
    lastSplit,
    playerAge,
    isPastPeak,
    destinyPromptPending,
    canRetire,
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
    continueAfterEventOutcome,
    continueAfterResult,
    resolveOffseasonDestiny,
    acceptOffer,
    stayWithTeam,
    retireCareer,
  };
}
