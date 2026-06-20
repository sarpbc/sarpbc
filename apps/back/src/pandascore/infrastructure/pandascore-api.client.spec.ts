import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { PandascoreApiClient } from "./pandascore-api.client";
import { PandascoreApiError } from "./pandascore-api.errors";

describe("PandascoreApiClient", () => {
  let client: PandascoreApiClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PandascoreApiClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("test-token"),
          },
        },
      ],
    }).compile();

    client = module.get(PandascoreApiClient);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("throws when API token is missing", async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          PandascoreApiClient,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
        ],
      }).compile(),
    ).rejects.toThrow("PandaScore API token not configured");
  });

  it("listAdditions builds query params and paginates", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, type: "match", modified_at: "2025-01-01T00:00:00Z" }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    const since = new Date("2025-01-01T00:00:00Z");
    const additions = await client.listAdditions({
      since,
      videogame: ["rl"],
      type: ["match", "tournament"],
      perPage: 1,
    });

    expect(additions).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    const firstCallUrl = String((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(firstCallUrl).toContain("/additions");
    expect(firstCallUrl).toContain("since=2025-01-01T00%3A00%3A00.000Z");
    expect(firstCallUrl).toContain("videogame%5B%5D=rl");
    expect(firstCallUrl).toContain("type%5B%5D=match");
    expect(firstCallUrl).toContain("type%5B%5D=tournament");
  });

  it("getTournamentById returns null on 404", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const result = await client.getTournamentById(999);
    expect(result).toBeNull();
  });

  it("request throws PandascoreApiError on failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    await expect(client.getTournamentBrackets(1)).rejects.toBeInstanceOf(PandascoreApiError);
  });
});
