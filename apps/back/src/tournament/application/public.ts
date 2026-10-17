export { TournamentService } from "./tournament.service";
export { ManualTournamentService } from "./manual-tournament.service";
export { MatchService } from "./match/match.service";
export { PlayerAwardService } from "./player-award.service";
export type { Tournament, Match, TournamentParticipant, League } from "../domain/competition";
export type { TournamentQueries, MatchQueries, MatchScoring } from "./ports";
