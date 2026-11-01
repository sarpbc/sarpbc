import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { Team } from "../../../roster/domain/roster";
import { Tournament, TournamentParticipant } from "../../../tournament/domain/competition";
import { resolveMatchParticipantIds, type TeamLookup } from "./resolve-match-participants";

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
  const lookup: TeamLookup = {
    findById: vi.fn(
      async (id: string) => [kc, m8, outsider].find((entry) => entry.id === id) ?? null,
    ),
    findBySlug: vi.fn(
      async (slug: string) => [kc, m8, outsider].find((entry) => entry.slug === slug) ?? null,
    ),
  };
  return { cup, kc, m8, lookup };
}

describe("resolveMatchParticipantIds", () => {
  it("keeps tournament participant ids", async () => {
    const { cup, lookup } = tournament();
    const resolved = await resolveMatchParticipantIds(
      cup,
      { participantIds: ["p-kc", "p-m8"] },
      lookup,
    );
    expect(resolved.map((entry) => entry.id)).toEqual(["p-kc", "p-m8"]);
    expect(lookup.findById).not.toHaveBeenCalled();
  });

  it("resolves team slugs and ids and ignores duplicates", async () => {
    const { cup, kc, lookup } = tournament();
    const resolved = await resolveMatchParticipantIds(
      cup,
      { participantIds: ["p-kc"], teams: [kc.id, "gentle-mates", "karmine-corp"] },
      lookup,
    );
    expect(resolved.map((entry) => entry.id)).toEqual(["p-kc", "p-m8"]);
    expect(lookup.findById).toHaveBeenCalledWith(KC_ID);
  });

  it("rejects an unknown participant, a missing team, and a team that is not registered", async () => {
    const { cup, lookup } = tournament();
    await expect(
      resolveMatchParticipantIds(cup, { participantIds: ["missing", "p-kc"] }, lookup),
    ).rejects.toThrow(BadRequestException);
    await expect(
      resolveMatchParticipantIds(cup, { teams: ["missing-slug", "karmine-corp"] }, lookup),
    ).rejects.toThrow(NotFoundException);
    await expect(
      resolveMatchParticipantIds(cup, { teams: ["outsider", "karmine-corp"] }, lookup),
    ).rejects.toThrow('Team "Outsider" (outsider) is not registered in "Coupe"');
  });

  it("tells the caller when a participant id was passed as a team", async () => {
    const { cup, lookup } = tournament();
    await expect(
      resolveMatchParticipantIds(cup, { teams: ["p-kc", "gentle-mates"] }, lookup),
    ).rejects.toThrow(/participant id for Karmine Corp \(karmine-corp\)/);
  });

  it("requires two different participants", async () => {
    const { cup, lookup } = tournament();
    await expect(resolveMatchParticipantIds(cup, {}, lookup)).rejects.toThrow(
      /at least two different participants/,
    );
    await expect(
      resolveMatchParticipantIds(cup, { teams: ["karmine-corp", "karmine-corp"] }, lookup),
    ).rejects.toThrow(/at least two different participants/);
  });
});
