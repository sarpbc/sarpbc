import { Module } from "@nestjs/common";
import { PatModule } from "src/pat/pat.module";
import { SearchModule } from "src/search/search.module";
import { PlayerModule } from "src/player/player.module";
import { TeamModule } from "src/team/team.module";
import { TournamentModule } from "src/tournament/tournament.module";
import { NewsModule } from "src/news/news.module";
import { UserModule } from "src/user/user.module";
import { RedisModule } from "src/redis/redis.module";
import { McpController } from "./mcp.controller";
import { McpServerFactory } from "./mcp-server.factory";

@Module({
  imports: [
    PatModule,
    SearchModule,
    PlayerModule,
    TeamModule,
    TournamentModule,
    NewsModule,
    UserModule,
    RedisModule,
  ],
  controllers: [McpController],
  providers: [McpServerFactory],
})
export class McpModule {}
