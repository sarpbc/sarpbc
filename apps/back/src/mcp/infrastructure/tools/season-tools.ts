import { z } from "zod";
import type { SeasonService } from "../../../season/application/season.service";
import { defineTool, type McpTool } from "../define-tool";
import { playerUrl } from "../urls";

export interface SeasonToolServices {
  seasonService: Pick<SeasonService, "list" | "detail">;
}

export function seasonTools({ seasonService }: SeasonToolServices): McpTool[] {
  return [
    defineTool({
      name: "list_seasons",
      description:
        "List the seasons and leagues staff created on sarpbc.org to hold awards that no single tournament stage holds, such as a Season MVP or a Regional MVP. Use get_season for the awards already recorded.",
      input: {},
      handler: async () => await seasonService.list(),
    }),

    defineTool({
      name: "get_season",
      description:
        "Get one season with its recorded awards: type, region, presenting partner, official source and player. A season holds one award of each type, and one Regional MVP per region. Read it before propose_season_award.",
      input: { id: z.uuid().describe("Season UUID from list_seasons.") },
      handler: async ({ id }) => {
        const season = await seasonService.detail(id);

        return {
          id: season.id,
          name: season.name,
          awards: season.awards.map((award) => ({
            ...award,
            player: { ...award.player, url: playerUrl(award.player.slug) },
          })),
        };
      },
    }),
  ];
}
