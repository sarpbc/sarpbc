import { describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError } from "../../../common/domain/errors";
import { Player, Team } from "../../../roster/domain/roster";
import { Tournament, TournamentParticipant } from "../../../tournament/domain/competition";
import type { IdOrSlugLookup } from "./find-by-id-or-slug";
import { resolveMatchParticipantIds } from "./resolve-match-participants";

const KC_ID = "11111111-1111-4111-8111-111111111111";
const M8_ID = "22222222-2222-4222-8222-222222222222";
const OUT_ID = "33333333-3333-4333-8333-333333333333";

function team(id: string, slug: string, name: string) {
  return Object.assign(new Team(), { id, slug, name });
}

function participant(id: string, club: Team) {
  return Object.assign(new TournamentParticipant(), { id, team: club });
}

function tournament() {
  const kc = team(KC_ID, "karmine-corp", "Karmine Corp");
  const m8 = team(M8_ID, "gentle-mates", "Gentle Mates");
  const outsider = team(OUT_ID, "outsider", "Outsider");
  const cup = Object.assign(new Tournament(), {
    id: "cup",
    name: "Coupe",
    participants: [participant("p-kc", kc), participant("p-m8", m8)],
  });
  const lookup: IdOrSlugLookup<Team> = {
    findById: vi.fn(
      async (id: string) => [kc, m8, outsider].find((entry) => entry.id === id) ?? null,
    ),
    findBySlug: vi.fn(
      async (slug: string) => [kc, m8, outsider].find((entry) => entry.slug === slug) ?? null,
    ),
  };
  return { cup, kc, m8, lookup };
}

const noPlayers: IdOrSlugLookup<Player> = {
  findById: async () => null,
  findBySlug: async () => null,
};

describe("resolveMatchParticipantIds", () => {
  it("keeps tournament participant ids", async () => {
    const { cup, lookup } = tournament();
    const resolved = await resolveMatchParticipantIds(
      cup,
      { participantIds: ["p-kc", "p-m8"] },
      { teams: lookup, players: noPlayers },
    );
    expect(resolved.map((entry) => entry.id)).toEqual(["p-kc", "p-m8"]);
    expect(lookup.findById).not.toHaveBeenCalled();
  });

  it("resolves team slugs and ids and ignores duplicates", async () => {
    const { cup, kc, lookup } = tournament();
    const resolved = await resolveMatchParticipantIds(
      cup,
      { participantIds: ["p-kc"], teams: [kc.id, "gentle-mates", "karmine-corp"] },
      { teams: lookup, players: noPlayers },
    );
    expect(resolved.map((entry) => entry.id)).toEqual(["p-kc", "p-m8"]);
    expect(lookup.findById).toHaveBeenCalledWith(KC_ID);
  });

  it("rejects an unknown participant, a missing team, and a team that is not registered", async () => {
    const { cup, lookup } = tournament();
    await expect(
      resolveMatchParticipantIds(
        cup,
        { participantIds: ["missing", "p-kc"] },
        { teams: lookup, players: noPlayers },
      ),
    ).rejects.toThrow(InvalidInputError);
    await expect(
      resolveMatchParticipantIds(
        cup,
        { teams: ["missing-slug", "karmine-corp"] },
        { teams: lookup, players: noPlayers },
      ),
    ).rejects.toThrow(NotFoundError);
    await expect(
      resolveMatchParticipantIds(
        cup,
        { teams: ["outsider", "karmine-corp"] },
        { teams: lookup, players: noPlayers },
      ),
    ).rejects.toThrow('Team "Outsider" (outsider) is not registered in "Coupe"');
  });

  it("tells the caller when a participant id was passed as a team", async () => {
    const { cup, lookup } = tournament();
    await expect(
      resolveMatchParticipantIds(
        cup,
        { teams: ["p-kc", "gentle-mates"] },
        { teams: lookup, players: noPlayers },
      ),
    ).rejects.toThrow(/participant id for Karmine Corp\. Pass it in participantIds/);
  });

  it("requires two different participants", async () => {
    const { cup, lookup } = tournament();
    await expect(
      resolveMatchParticipantIds(cup, {}, { teams: lookup, players: noPlayers }),
    ).rejects.toThrow(/at least two different participants/);
    await expect(
      resolveMatchParticipantIds(
        cup,
        { teams: ["karmine-corp", "karmine-corp"] },
        { teams: lookup, players: noPlayers },
      ),
    ).rejects.toThrow(/at least two different participants/);
  });

  it("resolves the 1v1 participants of players without creating a team", async () => {
    const zen = Object.assign(new Player(), { id: "zen-id", slug: "zen", name: "Zen" });
    const vatira = Object.assign(new Player(), { id: "vatira-id", slug: "vatira", name: "Vatira" });
    const knockout = Object.assign(new Tournament(), {
      id: "knockout",
      name: "Fake Knockout",
      format: "1v1",
      participants: [
        Object.assign(new TournamentParticipant(), { id: "p-zen", team: null, players: [zen] }),
        Object.assign(new TournamentParticipant(), {
          id: "p-vatira",
          team: null,
          players: [vatira],
        }),
      ],
    });
    const players: IdOrSlugLookup<Player> = {
      findById: async (id) => [zen, vatira].find((player) => player.id === id) ?? null,
      findBySlug: async (slug) => [zen, vatira].find((player) => player.slug === slug) ?? null,
    };
    const resolved = await resolveMatchParticipantIds(
      knockout,
      { players: ["zen", "vatira"] },
      { teams: tournament().lookup, players },
    );
    expect(resolved.map((entry) => entry.id)).toEqual(["p-zen", "p-vatira"]);
    await expect(
      resolveMatchParticipantIds(
        knockout,
        { players: ["p-zen", "vatira"] },
        { teams: tournament().lookup, players },
      ),
    ).rejects.toThrow(/participant id for Zen/);
  });
});
