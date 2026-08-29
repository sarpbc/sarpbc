/**
 * MikroORM entity registry — single manifest for CLI and runtime.
 *
 * Datetime conventions (schema `.type()`):
 * - `timestamptz` — instants (createdAt, updatedAt, beginAt, endAt)
 * - `date` — calendar-only fields (birthday, contract dates)
 */
import { AirRiddleSchema } from "./game/airriddle/domain/airriddle.entity";
import { PickemChoiceSchema } from "./game/pickem/domain/pickem.entity";
import {
  TopicSchema,
  PostSchema,
  PostTranslationSchema,
  ReplySchema,
  ReplyReportSchema,
} from "./forum/forum.entities";
import { ImageSchema } from "./images/domain/image.entity";
import { NewsArticleSchema } from "./news/domain/news-article.entity";
import {
  PlayerSchema,
  ContractSchema,
  PlayerPhotoSchema,
  TeamSchema,
} from "./player/player.entities";
import {
  LeagueSchema,
  TournamentSchema,
  TournamentParticipantSchema,
  MatchSchema,
  BracketLinkSchema,
  MatchResultSchema,
} from "./tournament/tournament.entities";
import { PlayerAwardSchema } from "./tournament/player-award.entities";
import { ReplyNotificationSchema } from "./notification/reply-notification.entity";
import { PersonalAccessTokenSchema } from "./pat/domain/personal-access-token.entity";
import { UserSchema } from "./user/domain/user.entity";

export const mikroOrmEntities = [
  UserSchema,
  PersonalAccessTokenSchema,
  TeamSchema,
  PlayerSchema,
  ContractSchema,
  PlayerPhotoSchema,
  LeagueSchema,
  TournamentSchema,
  TournamentParticipantSchema,
  MatchSchema,
  BracketLinkSchema,
  MatchResultSchema,
  PlayerAwardSchema,
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
];
