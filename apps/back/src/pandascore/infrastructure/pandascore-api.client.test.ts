import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { requestUrl } from "../../../test/fetch-mock";
import { PandascoreApiClient } from "./pandascore-api.client";
import { PandascoreApiError } from "./pandascore-api.errors";

describe(PandascoreApiClient, () => {
  const fetchMock = vi.fn<typeof fetch>();
  let client: PandascoreApiClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PandascoreApiClient,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn<(key: string) => string | undefined>().mockReturnValue("test-token"),
          },
        },
      ],
    }).compile();

    client = module.get(PandascoreApiClient);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it("throws when API token is missing", async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          PandascoreApiClient,
          {
            provide: ConfigService,
            useValue: {
              get: vi.fn<(key: string) => string | undefined>().mockReturnValue(undefined),
            },
          },
        ],
      }).compile(),
    ).rejects.toThrow("PandaScore API token not configured");
  });

  describe("listIncidents", () => {
    let incidents: Awaited<ReturnType<PandascoreApiClient["listIncidents"]>>;

    beforeEach(async () => {
      fetchMock
        .mockResolvedValueOnce(
          Response.json([{ id: 1, type: "match", modified_at: "2025-01-01T00:00:00Z" }]),
        )
        .mockResolvedValueOnce(Response.json([]));

      incidents = await client.listIncidents({
        since: new Date("2025-01-01T00:00:00Z"),
        perPage: 1,
      });
    });

    it("paginates until an empty page", () => {
      expect(incidents).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("builds the query params", () => {
      const firstCallUrl = requestUrl(fetchMock.mock.calls[0]?.[0]);

      expect(firstCallUrl).toContain("/incidents");
      expect(firstCallUrl).toContain("since=2025-01-01T00%3A00%3A00.000Z");
      expect(firstCallUrl).toContain("videogame=rl");
      expect(firstCallUrl).not.toContain("videogame%5B%5D=");
    });
  });

  it("getTournaments merges past, upcoming, and running", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json([{ id: 1, name: "Past" }]))
      .mockResolvedValueOnce(Response.json([{ id: 2, name: "Upcoming" }]))
      .mockResolvedValueOnce(
        Response.json([
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

    const urls = fetchMock.mock.calls.map(([input]) => requestUrl(input));
    expect(urls[0]).toContain("/rl/tournaments/past");
    expect(urls[1]).toContain("/rl/tournaments/upcoming");
    expect(urls[2]).toContain("/rl/tournaments/running");
  });

  it("getTournamentById returns null on 404", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404, statusText: "Not Found" }));

    const result = await client.getTournamentById(999);
    expect(result).toBeNull();
  });

  it("getTournamentById rethrows failures other than 404 instead of reporting not found", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 429, statusText: "Too Many Requests" }),
    );

    await expect(client.getTournamentById(999)).rejects.toMatchObject({ status: 429 });
  });

  it("request throws PandascoreApiError on failure", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401, statusText: "Unauthorized" }));

    await expect(client.getTournamentBrackets(1)).rejects.toBeInstanceOf(PandascoreApiError);
  });
});
