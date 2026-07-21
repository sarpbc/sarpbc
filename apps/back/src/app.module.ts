import { Module } from "@nestjs/common";
import { EvlogModule } from "evlog/nestjs";
import { PostHogModule } from "./posthog/posthog.module";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { TeamModule } from "./team/team.module";
import { PlayerModule } from "./player/player.module";
import { SearchModule } from "./search/search.module";
import { ConfigModule } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { RedisModule } from "./redis/redis.module";
import configuration from "./config/configuration";
import { ScheduleModule } from "@nestjs/schedule";
import { GameModule } from "./game/game.module";
import { ForumModule } from "./forum/forum.module";
import { TournamentModule } from "./tournament/tournament.module";
import { PandascoreModule } from "./pandascore/pandascore.module";
import { NewsModule } from "./news/news.module";
import { ReplyModule } from "./reply/reply.module";
import { ImagesModule } from "./images/images.module";
import mikroOrmConfig from "./mikro-orm.config";

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    EvlogModule.forRoot(),
    PostHogModule,
    MikroOrmModule.forRoot({
      ...mikroOrmConfig,
      driver: PostgreSqlDriver,
    }),
    ScheduleModule.forRoot(),
    UserModule,
    AuthModule,
    TeamModule,
    PlayerModule,
    SearchModule,
    GameModule,
    ForumModule,
    TournamentModule,
    RedisModule,
    PandascoreModule,
    NewsModule,
    ReplyModule,
    ImagesModule,
  ],
})
export class AppModule {}
