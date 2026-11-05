import { describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type { PlayerLinkStore, StatsCandidates } from "./ports";
import { StatsPlayerLinkService } from "./stats-player-link.service";

const link = { platform: "steam", platformId: "76561198224723032", playerId: "kofyr" };

function setup() {
  const candidates: StatsCandidates = {
    tournamentExists: vi.fn(async (id: string) => id === "t1"),
    matches: vi.fn(),
  };
  const links = {
    unlinked: vi.fn<PlayerLinkStore["unlinked"]>(async () => []),
    onTournamentRoster: vi.fn<PlayerLinkStore["onTournamentRoster"]>(
      async (_tournamentId, playerId) => playerId === "kofyr",
    ),
    link: vi.fn<PlayerLinkStore["link"]>(async () => 3),
  } satisfies PlayerLinkStore;
  return { service: new StatsPlayerLinkService(candidates, links), links };
}

describe("StatsPlayerLinkService", () => {
  it("links a tournament roster player and reports the rows repointed", async () => {
    const { service, links } = setup();

    expect(await service.link("t1", link)).toBe(3);
    expect(links.link).toHaveBeenCalledWith(link);
  });

  it("rejects a player outside the tournament rosters without writing", async () => {
    const { service, links } = setup();

    await expect(service.link("t1", { ...link, playerId: "stranger" })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(links.link).not.toHaveBeenCalled();
  });

  it("rejects an unknown tournament", async () => {
    const { service, links } = setup();

    await expect(service.link("missing", link)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.unlinked("missing")).rejects.toBeInstanceOf(NotFoundError);
    expect(links.unlinked).not.toHaveBeenCalled();
  });
});
