export {
  REGIONAL_POINTS,
  MAJOR_POINTS,
  regionalCircuitWeight,
  computeSeasonPoints,
  computeCircuitPoints,
} from "~/utils/career/points";

export {
  type SplitSimulation,
  type FieldPlayer,
  circuitPointsForSplit,
  getSplitFeedback,
  getWorldsFeedback,
  simulateSplitField,
  splitFieldToResult,
  upsertSplitField,
  simulateWorldsField,
  getEventsBeforeStage,
  qualifiesForWorlds,
  createRng,
  hashString,
} from "~/utils/career/splitSimulation";

export {
  type RankedRosterPlayer,
  type RankedTeam,
  type RankedPlayer,
  type WorldRankings,
  type PlayerCircuitInput,
  snapshotWorldRanking,
  computeWorldRankings,
  getTeamRank,
  pickStartingTeam,
} from "~/utils/career/rankings";

export {
  type OffseasonResolution,
  getTransferBand,
  pickOffseasonOffers,
  resolveOffseasonContracts,
} from "~/utils/career/transferMarket";

export { deriveTrophies } from "~/utils/career/trophies";
