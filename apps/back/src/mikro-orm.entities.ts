/**
 * MikroORM entity registry — single manifest for CLI and runtime.
 *
 * Datetime conventions (schema `.type()`):
 * - `timestamptz` — instants (createdAt, updatedAt, beginAt, endAt)
 * - `date` — calendar-only fields (birthday, contract dates)
 */
import { AirRiddleSchema } from "./game/airriddle/infrastructure/persistence/airriddle.entity";
import { PickemChoiceSchema } from "./game/pickem/infrastructure/persistence/pickem.entity";
import {
  TopicSchema,
  PostSchema,
  PostTranslationSchema,
} from "./forum/infrastructure/persistence/forum.schemas";
import { ReplySchema, ReplyReportSchema } from "./reply/infrastructure/persistence/reply.schemas";
import { ImageSchema } from "./images/infrastructure/persistence/image.entity";
import { NewsArticleSchema } from "./news/infrastructure/persistence/news-article.entity";
import {
  PlayerSchema,
  ContractSchema,
  PlayerPhotoSchema,
  TeamSchema,
  TeamAliasSchema,
} from "./roster/infrastructure/persistence/player.schemas";
import {
  LeagueSchema,
  TournamentEventSchema,
  TournamentSchema,
  TournamentParticipantSchema,
  MatchSchema,
  BracketLinkSchema,
  MatchResultSchema,
} from "./tournament/infrastructure/persistence/tournament.schemas";
import {
  CircuitSchema,
  CircuitStageSchema,
  CircuitStageTeamSchema,
} from "./circuit/infrastructure/persistence/circuit.schemas";
import {
  SeasonAwardSchema,
  SeasonParticipantSchema,
  SeasonPathEntrySchema,
  SeasonSchema,
} from "./season/infrastructure/persistence/season.schemas";
import { OnThisDayFactSchema } from "./on-this-day/infrastructure/persistence/on-this-day-fact.entities";
import { PlayerAwardSchema } from "./tournament/infrastructure/persistence/player-award.entities";
import { TournamentPrizeSchema } from "./tournament/infrastructure/persistence/tournament-prize.entities";
import { MatchLineupPlayerSchema } from "./tournament/infrastructure/persistence/match-lineup.entities";
import { ReplyNotificationSchema } from "./notification/infrastructure/persistence/reply-notification.entity";
import { PersonalAccessTokenSchema } from "./pat/infrastructure/persistence/personal-access-token.entity";
import { UserSchema } from "./user/infrastructure/persistence/user.entity";
import { RosterProposalSchema } from "./roster-proposal/infrastructure/persistence/roster-proposal.entity";
import { TwitchStreamerSchema } from "./streamer/infrastructure/persistence/twitch-streamer.entity";
import {
  MatchGameExclusionSchema,
  MatchGameSchema,
  MatchGamePlayerSchema,
  MatchStatsImportSchema,
  PlayerPlatformLinkSchema,
} from "./match-stats/infrastructure/persistence/match-stats.schemas";

export const mikroOrmEntities = [
  UserSchema,
  PersonalAccessTokenSchema,
  TeamSchema,
  TeamAliasSchema,
  PlayerSchema,
  ContractSchema,
  PlayerPhotoSchema,
  RosterProposalSchema,
  LeagueSchema,
  TournamentEventSchema,
  TournamentSchema,
  TournamentParticipantSchema,
  MatchSchema,
  BracketLinkSchema,
  MatchResultSchema,
  MatchGameSchema,
  MatchGamePlayerSchema,
  MatchGameExclusionSchema,
  MatchStatsImportSchema,
  PlayerPlatformLinkSchema,
  PlayerAwardSchema,
  TournamentPrizeSchema,
  MatchLineupPlayerSchema,
  CircuitSchema,
  CircuitStageSchema,
  CircuitStageTeamSchema,
  SeasonSchema,
  SeasonAwardSchema,
  SeasonParticipantSchema,
  SeasonPathEntrySchema,
  OnThisDayFactSchema,
  TopicSchema,
  PostSchema,
  PostTranslationSchema,
  ReplySchema,
  ReplyReportSchema,
  ReplyNotificationSchema,
  NewsArticleSchema,
  PickemChoiceSchema,
  AirRiddleSchema,
  ImageSchema,
  TwitchStreamerSchema,
];
