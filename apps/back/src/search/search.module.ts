import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { PlayerModule } from "../player/player.module";
import { TeamModule } from "../team/team.module";

@Module({
  imports: [PlayerModule, TeamModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
