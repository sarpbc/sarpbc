import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { PandascoreApiClient } from "./pandascore-api.client";
import { PandascoreApiError } from "./pandascore-api.errors";

const BASE_URL = "https://api.pandascore.co";

describe(PandascoreApiClient, () => {
  const server = setupServer();
  let requested: URL[];
  let client: PandascoreApiClient;

  const serve = (path: string, respond: (url: URL) => Response) => {
    server.use(
      http.get(`${BASE_URL}${path}`, ({ request }) => {
        const url = new URL(request.url);
        requested.push(url);

        return respond(url);
      }),
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
  });

  beforeEach(async () => {
    requested = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PandascoreApiClient,
        {
          provide: ConfigService,
          useValue: new ConfigService({ pandascore_api_token: "test-token" }),
        },
      ],
    }).compile();

    client = module.get(PandascoreApiClient);
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("throws when API token is missing", async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          PandascoreApiClient,
          { provide: ConfigService, useValue: new ConfigService({}) },
        ],
      }).compile(),
    ).rejects.toThrow("PandaScore API token not configured");
  });

  describe("listIncidents", () => {
    let incidents: Awaited<ReturnType<PandascoreApiClient["listIncidents"]>>;

    beforeEach(async () => {
      serve("/incidents", (url) =>
        HttpResponse.json(
          url.searchParams.get("page") === "1"
            ? [{ id: 1, modified_at: "2025-01-01T00:00:00Z", type: "match" }]
            : [],
        ),
      );

      incidents = await client.listIncidents({
        perPage: 1,
        since: new Date("2025-01-01T00:00:00Z"),
      });
    });

    it("paginates until an empty page", () => {
      expect(incidents).toHaveLength(1);
      expect(requested).toHaveLength(2);
    });

    it("builds the query params", () => {
      const [firstCall] = requested;

      expect(firstCall?.pathname).toBe("/incidents");
      expect(firstCall?.searchParams.get("since")).toBe("2025-01-01T00:00:00.000Z");
      expect(firstCall?.searchParams.getAll("videogame")).toStrictEqual(["rl"]);
      expect(firstCall?.search).not.toContain("videogame%5B%5D=");
    });
  });

  it("getTournaments merges past, upcoming, and running", async () => {
    serve("/rl/tournaments/past", () => HttpResponse.json([{ id: 1, name: "Past" }]));
    serve("/rl/tournaments/upcoming", () => HttpResponse.json([{ id: 2, name: "Upcoming" }]));
    serve("/rl/tournaments/running", () =>
      HttpResponse.json([
        { id: 2, name: "Upcoming duplicate" },
        { id: 3, name: "Running" },
      ]),
    );

    const tournaments = await client.getTournaments();

    expect(tournaments).toStrictEqual([
      { id: 1, name: "Past" },
      { id: 2, name: "Upcoming" },
      { id: 3, name: "Running" },
    ]);
  });

  it("getTournamentById returns null on 404", async () => {
    serve(
      "/tournaments/999",
      () => new HttpResponse(null, { status: 404, statusText: "Not Found" }),
    );

    const result = await client.getTournamentById(999);
    expect(result).toBeNull();
  });

  it("getTournamentById rethrows failures other than 404 instead of reporting not found", async () => {
    serve(
      "/tournaments/999",
      () => new HttpResponse(null, { status: 429, statusText: "Too Many Requests" }),
    );

    await expect(client.getTournamentById(999)).rejects.toMatchObject({ status: 429 });
  });

  it("request throws PandascoreApiError on failure", async () => {
    serve(
      "/tournaments/1/brackets",
      () => new HttpResponse(null, { status: 401, statusText: "Unauthorized" }),
    );

    await expect(client.getTournamentBrackets(1)).rejects.toBeInstanceOf(PandascoreApiError);
  });
});
