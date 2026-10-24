import { ExecutionContext, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { EvlogModule } from "evlog/nestjs";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PostHogModule } from "./infrastructure/telemetry/posthog.module";
import { UserModule } from "./user/infrastructure/user.module";
import { AuthModule } from "./auth/infrastructure/auth.module";
import { TeamModule } from "./team/infrastructure/team.module";
import { PlayerModule } from "./player/infrastructure/player.module";
import { SearchModule } from "./search/infrastructure/search.module";
import { ConfigModule } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { RedisModule } from "./infrastructure/redis/redis.module";
import { HealthModule } from "./infrastructure/health/health.module";
import configuration from "./infrastructure/config/configuration";
import { validateEnv } from "./infrastructure/config/env.validation";
import { AllExceptionsFilter } from "./common/infrastructure/http/filters/all-exceptions.filter";
import { ScheduleModule } from "@nestjs/schedule";
import { GameModule } from "./game/infrastructure/game.module";
import { ForumModule } from "./forum/infrastructure/forum.module";
import { TournamentModule } from "./tournament/infrastructure/tournament.module";
import { PandascoreModule } from "./pandascore/infrastructure/pandascore.module";
import { NewsModule } from "./news/infrastructure/news.module";
import { ReplyModule } from "./reply/infrastructure/reply.module";
import { ModerationModule } from "./moderation/infrastructure/moderation.module";
import { NotificationModule } from "./notification/infrastructure/notification.module";
import { ImagesModule } from "./images/infrastructure/images.module";
import { StorageModule } from "./storage/infrastructure/storage.module";
import { PatModule } from "./pat/infrastructure/pat.module";
import { McpModule } from "./mcp/infrastructure/mcp.module";
import { RosterProposalModule } from "./roster-proposal/infrastructure/roster-proposal.module";
import mikroOrmConfig from "./mikro-orm.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      validate: validateEnv,
    }),
    EvlogModule.forRoot(),
    ThrottlerModule.forRoot({
      skipIf: (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest<{ ip?: string }>();
        const ip = request.ip;
        return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
      },
      throttlers: [
        {
          name: "default",
          ttl: 60_000,
          limit: 100,
        },
      ],
    }),
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
    HealthModule,
    PandascoreModule,
    NewsModule,
    ReplyModule,
    ModerationModule,
    NotificationModule,
    ImagesModule,
    StorageModule,
    PatModule,
    McpModule,
    RosterProposalModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
