import { describe, expect, it, vi } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { PlayerLinkStore, StatsCandidates } from "./ports";
import { StatsPlayerLinkService } from "./stats-player-link.service";

const link = { platform: "steam", platformId: "76561198224723032", playerId: "kofyr" };

function setup() {
  const candidates: StatsCandidates = {
    tournamentExists: vi.fn(async (id: string) => id === "t1"),
    matches: vi.fn(),
  };

  const links = {
    accounts: vi.fn<PlayerLinkStore["accounts"]>(async () => []),
    rosters: vi.fn<PlayerLinkStore["rosters"]>(async () => [
      { participantId: "p1", teamName: "KC", players: [{ id: "kofyr", name: "kofyr" }] },
    ]),
    onTournamentRoster: vi.fn<PlayerLinkStore["onTournamentRoster"]>(
      async (_tournamentId, playerId) => playerId === "kofyr",
    ),
    link: vi.fn<PlayerLinkStore["link"]>(async () => 3),
  } satisfies PlayerLinkStore;

  return { service: new StatsPlayerLinkService(candidates, links), links };
}

describe(StatsPlayerLinkService, () => {
  it("links a tournament roster player and reports the rows repointed", async () => {
    const { service, links } = setup();

    await expect(service.link("t1", link)).resolves.toBe(3);
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
    await expect(service.accounts("missing")).rejects.toBeInstanceOf(NotFoundError);
    expect(links.accounts).not.toHaveBeenCalled();
  });

  it("lists the tournament's accounts with every roster of the tournament", async () => {
    const { service } = setup();

    await expect(service.accounts("t1")).resolves.toEqual({
      players: [],
      rosters: [{ participantId: "p1", teamName: "KC", players: [{ id: "kofyr", name: "kofyr" }] }],
    });
  });
});
