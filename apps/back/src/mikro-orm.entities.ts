/**
 * MikroORM entity registry — single manifest for CLI and runtime.
 *
 * Layout convention:
 * - Feature barrels (`*.entities.ts`) for domains with multiple related entities
 *   (forum, player, team, tournament).
 * - Single `*.entity.ts` files for standalone entities (user, news, image, games).
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
  TopicSchema,
  PostSchema,
  PostTranslationSchema,
  ReplySchema,
  NewsArticleSchema,
  PickemChoiceSchema,
  AirRiddleSchema,
  ImageSchema,
];
