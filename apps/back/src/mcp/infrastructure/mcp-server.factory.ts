import { Inject, Injectable } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PatUser } from "../../pat/application/pat.service";
import { registerTools } from "./define-tool";
import { MCP_SERVICES, type McpServices } from "./mcp-services";
import { redistributableCompetition } from "./redistributable-competition";
import { circuitTools } from "./tools/circuit-tools";
import { eventTools } from "./tools/event-tools";
import { gameStatsTools } from "./tools/game-stats-tools";
import { readTools } from "./tools/read-tools";
import { prizeTools } from "./tools/prize-tools";
import { rosterTools } from "./tools/roster-tools";
import { seasonTools } from "./tools/season-tools";
import { writeTools } from "./tools/write-tools";

@Injectable()
export class McpServerFactory {
  constructor(@Inject(MCP_SERVICES) private readonly services: McpServices) {}

  createServer(user: PatUser): McpServer {
    const server = new McpServer(
      {
        name: "sarpbc-staff-mcp",
        version: "1.0.0",
      },
      { capabilities: { logging: {} } },
    );

    const competition = redistributableCompetition(this.services);
    registerTools(server, user, [
      ...readTools({ ...this.services, competition }),
      ...eventTools({ ...this.services, competition }),
      ...writeTools(this.services),
      ...rosterTools(this.services),
      ...prizeTools(this.services),
      ...gameStatsTools(this.services),
      ...circuitTools(this.services),
      ...seasonTools(this.services),
    ]);

    return server;
  }
}
