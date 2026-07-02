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
  TeamSchema,
  PlayerSchema,
  ContractSchema,
  PlayerPhotoSchema,
} from "./player/player.entities";
import {
  LeagueSchema,
  TournamentSchema,
  TournamentParticipantSchema,
  MatchSchema,
  BracketLinkSchema,
  MatchResultSchema,
} from "./tournament/tournament.entities";
import { UserSchema } from "./user/domain/user.entity";

export const mikroOrmEntities = [
  UserSchema,
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
