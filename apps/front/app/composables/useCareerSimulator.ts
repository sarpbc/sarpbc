import { getEventById, pickRandomEvent } from "~/data/career/events";
import { getWorldTeamById } from "~/data/career/world";
import {
  clearActiveCareer,
  loadActiveCareer,
  saveActiveCareer,
  saveCareerResult,
} from "~/composables/useCareerStorage";
import { applyStatDelta, getAgeDecline, getStartingStats } from "~/utils/career/stats";
import {
  createCareerWorld,
  getRosterStrength,
  moveUserToTeam,
  tickNpcRatings,
} from "~/utils/career/roster";
import {
  computeCircuitPoints,
  computeSeasonPoints,
  computeWorldRankings,
  deriveTrophies,
  getSplitFeedback,
  getWorldsFeedback,
  hashString,
  pickStartingTeam,
  resolveOffseasonContracts,
  simulateSplit,
  simulateWorlds,
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
  WORLDS_QUALIFICATION_POINTS,
  applyDestinyLeanings,
  emptyDestinyLeanings,
  getPlayerAge,
  getRecommendedDestiny,
  getRetiredAge,
  getSeasonsPastPeak,
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
    const next = applyStatDelta(before, choice.delta);
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
    };
    state.value.phase = "event_result";
    persist();
  }

  function continueAfterEventOutcome() {
    state.value.currentEventId = null;
    state.value.lastEventOutcome = null;
    runStageSimulation();
    persist();
  }

  function runStageSimulation() {
    const stage = state.value.currentStage;
    const seed = hashString(`${state.value.id}:sim:${state.value.currentSeason}:${stage}`);
    const roster = state.value.world.rosters[state.value.currentTeamId];
    const teamStrength = roster
      ? getRosterStrength(roster, state.value.world, state.value.stats.rating)
      : undefined;

    switch (stage) {
      case "split1":
      case "split2": {
        const sim = simulateSplit(state.value.stats, state.value.role!, seed, teamStrength);
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
        const placement = simulateWorlds(state.value.stats, state.value.role!, seed, teamStrength);
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
      points: computeCircuitPoints(state.value.currentSplits, worlds),
      ratingEnd: state.value.stats.rating,
    };
    state.value.seasonRecords.push(record);

    const offerSeed = hashString(`${state.value.id}:offer:${state.value.currentSeason}`);
    const resolution = resolveOffseasonContracts(
      state.value.currentSeason,
      record.points,
      state.value.currentTeamId,
      worldRankings.value,
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
