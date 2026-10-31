import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { EvlogModule } from "evlog/nestjs";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PostHogModule } from "./infrastructure/telemetry/posthog.module";
import { UserModule } from "./user/infrastructure/user.module";
import { AuthModule } from "./auth/infrastructure/auth.module";
import { RosterModule } from "./roster/infrastructure/roster.module";
import { SearchModule } from "./search/infrastructure/search.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { RedisModule } from "./infrastructure/redis/redis.module";
import { HealthModule } from "./infrastructure/health/health.module";
import configuration from "./infrastructure/config/configuration";
import { validateEnv } from "./infrastructure/config/env.validation";
import { AllExceptionsFilter } from "./common/infrastructure/http/filters/all-exceptions.filter";
import { createClientThrottleOptions } from "./infrastructure/http/client-throttle";
import { EventEmitterModule } from "@nestjs/event-emitter";
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
import { StreamerModule } from "./streamer/infrastructure/streamer.module";
import mikroOrmConfig from "./mikro-orm.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      validate: validateEnv,
    }),
    EvlogModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createClientThrottleOptions(config.get<string>("internalApiToken")),
    }),
    PostHogModule,
    MikroOrmModule.forRoot({
      ...mikroOrmConfig,
      driver: PostgreSqlDriver,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    UserModule,
    AuthModule,
    RosterModule,
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
    StreamerModule,
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
