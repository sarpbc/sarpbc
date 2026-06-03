import { Module } from "@nestjs/common";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { TeamModule } from "./team/team.module";
import { PlayerModule } from "./player/player.module";
import { SearchModule } from "./search/search.module";
import { ConfigModule } from "@nestjs/config";
import { getDatabasePassword } from "./common/envirronement/secrets";
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

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    MikroOrmModule.forRoot({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5433", 10),
      user: process.env.DB_USER || "sarpbc",
      password: getDatabasePassword(),
      dbName: process.env.DB_NAME || "sarpbc",
      entities: ["dist/**/*.entity.js"],
      entitiesTs: ["src/**/*.entity.ts"],
      pool: {
        min: 0,
        max: 10,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 10000,
        acquireTimeoutMillis: 5000,
      },
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
