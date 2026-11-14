import type { SeasonDetail } from "@sarpbc/types";
import { beforeEach, describe, expect, it } from "vitest";
import { SEASON_TEAMS, memorySeasonStore } from "../../../test/season-store.memory";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { SeasonArchiveService } from "./season-archive.service";
import { SeasonService } from "./season.service";

const ANNOUNCEMENT = "https://x.com/RLEsports/status/1";

describe("SeasonArchiveService", () => {
  let seasons: SeasonService;
  let archives: SeasonArchiveService;
  let season: SeasonDetail;

  beforeEach(async () => {
    const { store } = memorySeasonStore();
    seasons = new SeasonService(store);
    archives = new SeasonArchiveService(store);
    season = await seasons.create({ name: "RLCS 2024", slug: "rlcs-2024" });
  });

  it("renders an empty published season and hides seasons without a slug", async () => {
    await seasons.create({ name: "Draft season" });

    expect(await archives.published()).toEqual([
      { slug: "rlcs-2024", name: "RLCS 2024", winner: null },
    ]);
    expect(await archives.archive("rlcs-2024")).toEqual({
      slug: "rlcs-2024",
      name: "RLCS 2024",
      format: { summary: null, phases: [] },
      winner: null,
      participants: [],
      awards: [],
    });
  });

  it("answers an unknown slug with not found", async () => {
    await expect(archives.archive("rlcs-1999")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("adds each team once, refuses merged ids and edits the path note", async () => {
    const participant = await archives.addParticipant(season.id, {
      teamId: "vitality",
      pathNote: "  Won both Majors. ",
    });

    expect(participant).toMatchObject({
      team: SEASON_TEAMS.vitality,
      pathNote: "Won both Majors.",
      path: [],
    });

    await expect(archives.addParticipant(season.id, { teamId: "vitality" })).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(archives.addParticipant(season.id, { teamId: "old-vitality" })).rejects.toThrow(
      'was merged into "vitality"',
    );
    await expect(archives.addParticipant(season.id, { teamId: "ghost" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(archives.addParticipant("missing", { teamId: "falcons" })).rejects.toBeInstanceOf(
      NotFoundError,
    );

    expect(await archives.updatePathNote(season.id, participant.id, " ")).toMatchObject({
      pathNote: null,
    });
    await expect(
      archives.updatePathNote(season.id, participant.id, "a".repeat(501)),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("attaches path entries with or without an existing tournament", async () => {
    const { id } = await archives.addParticipant(season.id, { teamId: "falcons" });

    const linked = await archives.addPathEntry(season.id, id, {
      label: " RLCS Major ",
      result: " 1st ",
      tournamentId: "major",
    });

    expect(linked).toMatchObject({ label: "RLCS Major", result: "1st" });
    expect(linked.tournament).toMatchObject({ id: "major", source: "pandascore" });
    expect(
      await archives.addPathEntry(season.id, id, { label: "Regional 3", result: "Top 4" }),
    ).toMatchObject({ tournament: null });

    await expect(
      archives.addPathEntry(season.id, id, { label: "Major", result: "1st", tournamentId: "nope" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      archives.addPathEntry(season.id, id, { label: " ", result: "1st" }),
    ).rejects.toThrow("The path entry label is required.");
    await expect(
      archives.addPathEntry(season.id, "missing", { label: "Major", result: "1st" }),
    ).rejects.toBeInstanceOf(NotFoundError);

    await archives.removePathEntry(season.id, id, linked.id);
    await expect(archives.removePathEntry(season.id, id, linked.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect((await seasons.detail(season.id)).participants[0]?.path).toHaveLength(1);
  });

  it("publishes the winner, the paths and the awards without staff-only fields", async () => {
    const vitality = await archives.addParticipant(season.id, { teamId: "vitality" });
    await archives.addParticipant(season.id, { teamId: "falcons" });
    await archives.addPathEntry(season.id, vitality.id, {
      label: "Community Open",
      result: "Qualified",
      tournamentId: "open",
    });
    await archives.addPathEntry(season.id, vitality.id, {
      label: "RLCS Major",
      result: "1st",
      tournamentId: "major",
    });
    await archives.addPathEntry(season.id, vitality.id, {
      label: "Regional 3",
      result: "2nd",
    });
    await seasons.update(season.id, {
      name: "RLCS 2024",
      winnerTeamId: "vitality",
      format: {
        summary: "Three splits ending in a Major each.",
        phases: [{ name: "Splits", description: null }],
      },
    });
    await seasons.addAward(season.id, {
      playerId: "zen",
      awardType: "season_mvp",
      sourceUrl: ANNOUNCEMENT,
    });

    const archive = await archives.archive("rlcs-2024");

    expect(archive.winner).toEqual(SEASON_TEAMS.vitality);
    expect(archive.format.phases).toEqual([{ name: "Splits", description: null }]);
    expect(archive.participants.map(({ team }) => team.name)).toEqual([
      "Team Falcons",
      "Team Vitality",
    ]);
    expect(archive.participants[1]?.path).toEqual([
      {
        label: "RLCS Major",
        result: "1st",
        tournament: {
          id: "major",
          name: "Playoffs",
          slug: "playoffs",
          event: { id: "major-event", slug: "rlcs-major", name: "RLCS Major" },
        },
      },
      { label: "Regional 3", result: "2nd", tournament: null },
    ]);
    expect(archive.awards).toEqual([
      {
        awardType: "season_mvp",
        region: null,
        presentedBy: null,
        sourceUrl: ANNOUNCEMENT,
        player: { name: "zen", slug: "zen" },
      },
    ]);
    expect(JSON.stringify(archive)).not.toMatch(/startgg|Community Open|participant-|"source"/);
    expect(await archives.published()).toEqual([
      { slug: "rlcs-2024", name: "RLCS 2024", winner: SEASON_TEAMS.vitality },
    ]);
  });

  it("keeps the winner until staff clear it, then removes the team", async () => {
    const vitality = await archives.addParticipant(season.id, { teamId: "vitality" });
    await seasons.update(season.id, { name: "RLCS 2024", winnerTeamId: "vitality" });

    await expect(archives.removeParticipant(season.id, vitality.id)).rejects.toThrow(
      "Clear the winner before removing the team.",
    );
    await seasons.update(season.id, { name: "RLCS 2024", winnerTeamId: null });
    await archives.removeParticipant(season.id, vitality.id);
    await expect(archives.removeParticipant(season.id, vitality.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect((await seasons.detail(season.id)).participants).toEqual([]);
  });
});
