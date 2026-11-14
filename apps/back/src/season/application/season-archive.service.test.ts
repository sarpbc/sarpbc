import type { SeasonDetail } from "@sarpbc/types";
import { beforeEach, describe, expect, it } from "vitest";
import { SEASON_TEAMS, memorySeasonStore } from "../../../test/season-store.memory";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { SeasonArchiveService } from "./season-archive.service";
import { SeasonService } from "./season.service";

const ANNOUNCEMENT = "https://x.com/RLEsports/status/1";

describe(SeasonArchiveService, () => {
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

    await expect(archives.published()).resolves.toStrictEqual([
      { slug: "rlcs-2024", name: "RLCS 2024", winner: null },
    ]);
    await expect(archives.archive("rlcs-2024")).resolves.toStrictEqual({
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

  it("adds a team with a trimmed path note", async () => {
    const participant = await archives.addParticipant(season.id, {
      teamId: "vitality",
      pathNote: "  Won both Majors. ",
    });

    expect(participant).toMatchObject({
      team: SEASON_TEAMS.vitality,
      pathNote: "Won both Majors.",
      path: [],
    });
  });

  it("refuses a team added twice", async () => {
    await archives.addParticipant(season.id, { teamId: "vitality" });

    await expect(archives.addParticipant(season.id, { teamId: "vitality" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("refuses merged teams, unknown teams and unknown seasons", async () => {
    await expect(archives.addParticipant(season.id, { teamId: "old-vitality" })).rejects.toThrow(
      'was merged into "vitality"',
    );
    await expect(archives.addParticipant(season.id, { teamId: "ghost" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(archives.addParticipant("missing", { teamId: "falcons" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("clears a blank path note and refuses an overlong one", async () => {
    const participant = await archives.addParticipant(season.id, {
      teamId: "vitality",
      pathNote: "Won both Majors.",
    });

    await expect(archives.updatePathNote(season.id, participant.id, " ")).resolves.toMatchObject({
      pathNote: null,
    });
    await expect(
      archives.updatePathNote(season.id, participant.id, "a".repeat(501)),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  describe("path entries", () => {
    let participantId: string;

    beforeEach(async () => {
      ({ id: participantId } = await archives.addParticipant(season.id, { teamId: "falcons" }));
    });

    it("attaches an entry linked to an existing tournament", async () => {
      const linked = await archives.addPathEntry(season.id, participantId, {
        label: " RLCS Major ",
        result: " 1st ",
        tournamentId: "major",
      });

      expect(linked).toMatchObject({ label: "RLCS Major", result: "1st" });
      expect(linked.tournament).toMatchObject({ id: "major", source: "pandascore" });
    });

    it("attaches an entry without a tournament", async () => {
      await expect(
        archives.addPathEntry(season.id, participantId, { label: "Regional 3", result: "Top 4" }),
      ).resolves.toMatchObject({ tournament: null });
    });

    it("refuses an unknown tournament, a blank label and an unknown participant", async () => {
      await expect(
        archives.addPathEntry(season.id, participantId, {
          label: "Major",
          result: "1st",
          tournamentId: "nope",
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(
        archives.addPathEntry(season.id, participantId, { label: " ", result: "1st" }),
      ).rejects.toThrow("The path entry label is required.");
      await expect(
        archives.addPathEntry(season.id, "missing", { label: "Major", result: "1st" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("removes an entry once and keeps the others", async () => {
      const linked = await archives.addPathEntry(season.id, participantId, {
        label: "Major",
        result: "1st",
        tournamentId: "major",
      });

      await archives.addPathEntry(season.id, participantId, {
        label: "Regional 3",
        result: "Top 4",
      });
      await archives.removePathEntry(season.id, participantId, linked.id);
      await expect(
        archives.removePathEntry(season.id, participantId, linked.id),
      ).rejects.toBeInstanceOf(NotFoundError);

      const detail = await seasons.detail(season.id);

      expect(detail.participants[0]?.path).toHaveLength(1);
    });
  });

  describe("published archive", () => {
    let archive: Awaited<ReturnType<SeasonArchiveService["archive"]>>;

    beforeEach(async () => {
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
      archive = await archives.archive("rlcs-2024");
    });

    it("publishes the winner and the format", () => {
      expect(archive.winner).toStrictEqual(SEASON_TEAMS.vitality);
      expect(archive.format.phases).toStrictEqual([{ name: "Splits", description: null }]);
    });

    it("lists participants by team name", () => {
      expect(archive.participants.map(({ team }) => team.name)).toStrictEqual([
        "Team Falcons",
        "Team Vitality",
      ]);
    });

    it("publishes a participant path without its unpublished tournaments", () => {
      expect(archive.participants[1]?.path).toStrictEqual([
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
    });

    it("publishes the awards", () => {
      expect(archive.awards).toStrictEqual([
        {
          awardType: "season_mvp",
          region: null,
          presentedBy: null,
          sourceUrl: ANNOUNCEMENT,
          player: { name: "zen", slug: "zen" },
        },
      ]);
    });

    it("omits staff-only fields", () => {
      expect(JSON.stringify(archive)).not.toMatch(/startgg|Community Open|participant-|"source"/);
    });

    it("lists the season with its winner", async () => {
      await expect(archives.published()).resolves.toStrictEqual([
        { slug: "rlcs-2024", name: "RLCS 2024", winner: SEASON_TEAMS.vitality },
      ]);
    });
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
    const detailResult2 = await seasons.detail(season.id);
    expect(detailResult2.participants).toStrictEqual([]);
  });
});
