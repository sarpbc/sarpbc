import type { CircuitSummary } from "@sarpbc/types";
import { isRedistributable } from "../../../common/domain/data-source";
import type { CircuitService } from "../../../circuit/application/circuit.service";
import { defineTool, type McpTool } from "../define-tool";
import { circuitUrl, tournamentUrl } from "../urls";
import { idOrSlugField } from "./tool-input";

export interface CircuitToolServices {
  circuitService: Pick<CircuitService, "list" | "detail" | "standings">;
}

function withUrl(circuit: CircuitSummary) {
  return { ...circuit, url: circuitUrl(circuit.slug) };
}

export function circuitTools({ circuitService }: CircuitToolServices): McpTool[] {
  return [
    defineTool({
      name: "list_circuits",
      description:
        "List the points circuits on sarpbc.org (a season or regional circuit whose official points scale staff entered). Use get_circuit for the stages, scales and standings.",
      input: {},
      handler: async () => (await circuitService.list()).map(withUrl),
    }),

    defineTool({
      name: "get_circuit",
      description:
        "Get one points circuit: each counted tournament stage with its official points scale (placement ranges and points) and source, then the standings computed from PandaScore final placements with an event-by-event breakdown. Only PandaScore stages count; start.gg and manual stages are never part of a circuit. Propose a stage scale with set_circuit_stage_scale.",
      input: { idOrSlug: idOrSlugField("Circuit", "season-2026") },
      handler: async ({ idOrSlug }) => {
        const detail = await circuitService.detail(idOrSlug);
        const standings = await circuitService.standings(detail.id);
        return {
          ...withUrl(detail),
          stages: detail.stages
            .filter(({ tournament }) => isRedistributable(tournament.source))
            .map((stage) => ({ ...stage, url: tournamentUrl(stage.tournament) })),
          events: standings.events,
          standings: standings.rows,
        };
      },
    }),
  ];
}
