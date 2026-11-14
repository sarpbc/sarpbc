import type { CircuitSummary } from "@sarpbc/types";
import {
  CIRCUIT_DESCRIPTION_MAX_LENGTH,
  CIRCUIT_NAME_MAX_LENGTH,
  CIRCUIT_REGION_MAX_LENGTH,
  MAX_CIRCUIT_QUALIFICATION_SPOTS,
  MAX_CIRCUIT_SEASON,
  MIN_CIRCUIT_SEASON,
} from "@sarpbc/utils";
import { z } from "zod";
import { isRedistributable } from "../../../common/domain/data-source";
import type { CircuitService } from "../../../circuit/application/circuit.service";
import { defineTool, type McpTool, type ToolWrite } from "../define-tool";
import { circuitUrl, tournamentUrl } from "../urls";
import { dataSourceUrlField, idOrSlugField } from "./tool-input";
import { requireUpdateFields } from "./update-fields";

export interface CircuitToolServices {
  circuitService: Pick<CircuitService, "list" | "detail" | "standings" | "create" | "update">;
}

function withUrl(circuit: CircuitSummary) {
  return { ...circuit, url: circuitUrl(circuit.slug) };
}

function written(circuit: CircuitSummary): ToolWrite {
  return {
    entityId: circuit.id,
    sourceUrl: circuit.sourceUrl ?? undefined,
    result: withUrl(circuit),
  };
}

const nameSchema = z
  .string()
  .trim()
  .min(1)
  .max(CIRCUIT_NAME_MAX_LENGTH)
  .describe("Circuit display name as the organiser publishes it (e.g. RLCS 2026).");

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .describe("URL slug of the circuit page (e.g. season-2026). Must be unique.");

const seasonSchema = z
  .number()
  .int()
  .min(MIN_CIRCUIT_SEASON)
  .max(MAX_CIRCUIT_SEASON)
  .describe("Season year of the circuit (e.g. 2026).");

const regionSchema = z
  .string()
  .trim()
  .max(CIRCUIT_REGION_MAX_LENGTH)
  .describe(
    "Region the circuit covers, as the rules name it (e.g. EU, NA, MENA, SAM, OCE, APAC, SSA). Omit it or use Worldwide for a worldwide circuit. In a regional circuit, a stage marked worldwide (such as a Major) credits only the region teams listed on that stage.",
  );

const descriptionSchema = z
  .string()
  .max(CIRCUIT_DESCRIPTION_MAX_LENGTH)
  .describe("Short neutral description shown on the circuit page.");

const sourceUrlSchema = dataSourceUrlField(
  "Required public page with the official circuit rules or announcement from the organiser. Never Liquipedia, a mirror of it or BLAST.tv.",
);

const qualificationSpotsSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_CIRCUIT_QUALIFICATION_SPOTS)
  .describe("Number of teams that qualify from the standings, when the rules state it.");

export function circuitTools({ circuitService }: CircuitToolServices): McpTool[] {
  return [
    defineTool({
      name: "list_circuits",
      description:
        "List the points circuits on sarpbc.org (a season circuit, worldwide or limited to one region, whose official points scales staff entered). Use get_circuit for the stages, scales and standings.",
      input: {},
      handler: async () => {
        const circuits = await circuitService.list();

        return circuits.map(withUrl);
      },
    }),

    defineTool({
      name: "get_circuit",
      description:
        "Get one points circuit: each counted tournament stage with its official points scale (placement ranges and points), source, worldwide flag, region teams and staff-entered final placements, then the standings with an event-by-event breakdown. Placements come from PandaScore standings and from the final placements staff entered. In a regional circuit a worldwide stage credits only its region teams. PandaScore and manual stages are returned; start.gg stages and their placements and points are left out of this response, even when staff attached them. Propose a stage scale with set_circuit_stage_scale.",
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

    defineTool({
      name: "create_circuit",
      description:
        "Create an empty points circuit on sarpbc.org, published at once. It has no stage and computes no points until a stage scale proposed with set_circuit_stage_scale is approved. Run list_circuits first: a slug already in use, or the same name for the same season and region, is refused. Copy the name, season and region from the official rules; never invent a circuit. Staff delete circuits in the admin app.",
      write: true,
      permission: "tournaments.manage",
      input: {
        name: nameSchema,
        slug: slugSchema,
        season: seasonSchema,
        region: regionSchema.optional(),
        description: descriptionSchema.optional(),
        sourceUrl: sourceUrlSchema,
        qualificationSpots: qualificationSpotsSchema.optional(),
      },
      handler: async (input) => written(await circuitService.create(input)),
    }),

    defineTool({
      name: "update_circuit",
      description:
        "Update a points circuit's name, slug, season, region, description, rules source or qualification spots; the change is published at once. Omitted fields stay unchanged; region, description and qualificationSpots accept null to clear them. Stage scales are changed with set_circuit_stage_scale. The same name for the same season and region as another circuit is refused.",
      write: true,
      permission: "tournaments.manage",
      input: {
        idOrSlug: idOrSlugField("Circuit", "season-2026"),
        name: nameSchema.optional(),
        slug: slugSchema.optional(),
        season: seasonSchema.optional(),
        region: regionSchema.nullable().optional(),
        description: descriptionSchema.nullable().optional(),
        sourceUrl: sourceUrlSchema.optional(),
        qualificationSpots: qualificationSpotsSchema.nullable().optional(),
      },
      handler: async ({ idOrSlug, ...fields }) => {
        requireUpdateFields(fields);

        return written(await circuitService.update(idOrSlug, fields));
      },
    }),
  ];
}
