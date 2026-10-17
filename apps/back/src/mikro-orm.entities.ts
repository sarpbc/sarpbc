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
  ReplySchema,
  ReplyReportSchema,
} from "./forum/infrastructure/persistence/forum.entities";
import { ImageSchema } from "./images/infrastructure/persistence/image.entity";
import { NewsArticleSchema } from "./news/infrastructure/persistence/news-article.entity";
import {
  PlayerSchema,
  ContractSchema,
  PlayerPhotoSchema,
  TeamSchema,
} from "./player/infrastructure/persistence/player.entities";
import {
  LeagueSchema,
  TournamentSchema,
  TournamentParticipantSchema,
  MatchSchema,
  BracketLinkSchema,
  MatchResultSchema,
} from "./tournament/infrastructure/persistence/tournament.entities";
import { PlayerAwardSchema } from "./tournament/infrastructure/persistence/player-award.entities";
import { ReplyNotificationSchema } from "./notification/infrastructure/persistence/reply-notification.entity";
import { PersonalAccessTokenSchema } from "./pat/infrastructure/persistence/personal-access-token.entity";
import { UserSchema } from "./user/infrastructure/persistence/user.entity";

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
