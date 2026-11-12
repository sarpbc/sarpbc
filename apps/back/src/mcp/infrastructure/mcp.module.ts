import { Module } from "@nestjs/common";
import { CircuitModule } from "../../circuit/infrastructure/circuit.module";
import { MatchStatsModule } from "../../match-stats/infrastructure/match-stats.module";
import { PatModule } from "../../pat/infrastructure/pat.module";
import { RosterModule } from "../../roster/infrastructure/roster.module";
import { TournamentModule } from "../../tournament/infrastructure/tournament.module";
import { NewsModule } from "../../news/infrastructure/news.module";
import { RosterProposalModule } from "../../roster-proposal/infrastructure/roster-proposal.module";
import { McpController } from "./mcp.controller";
import { McpServerFactory } from "./mcp-server.factory";
import { mcpServicesProvider } from "./mcp-services";

@Module({
  imports: [
    PatModule,
    RosterModule,
    TournamentModule,
    NewsModule,
    RosterProposalModule,
    MatchStatsModule,
    CircuitModule,
  ],
  controllers: [McpController],
  providers: [mcpServicesProvider, McpServerFactory],
})
export class McpModule {}
