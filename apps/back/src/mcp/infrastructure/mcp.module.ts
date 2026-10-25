import { Module } from "@nestjs/common";
import { PatModule } from "../../pat/infrastructure/pat.module";
import { SearchModule } from "../../search/infrastructure/search.module";
import { RosterModule } from "../../roster/infrastructure/roster.module";
import { TournamentModule } from "../../tournament/infrastructure/tournament.module";
import { NewsModule } from "../../news/infrastructure/news.module";
import { RosterProposalModule } from "../../roster-proposal/infrastructure/roster-proposal.module";
import { McpController } from "./mcp.controller";
import { McpServerFactory } from "./mcp-server.factory";

@Module({
  imports: [
    PatModule,
    SearchModule,
    RosterModule,
    TournamentModule,
    NewsModule,
    RosterProposalModule,
  ],
  controllers: [McpController],
  providers: [McpServerFactory],
})
export class McpModule {}
