import type { SeasonAward, SeasonParticipant, SeasonPathTournament } from "@sarpbc/types";
import type {
  SeasonAwardPlayer,
  SeasonParticipantTeam,
  SeasonRecord,
  SeasonStore,
} from "../src/season/application/ports";

interface StoredAward extends SeasonAward {
  seasonId: string;
}

interface StoredParticipant extends SeasonParticipant {
  seasonId: string;
}

const team = (id: string, name: string) => ({
  darkModeImageUrl: null,
  id,
  imageUrl: null,
  name,
  slug: id,
});

export const SEASON_TEAMS = {
  falcons: team("falcons", "Team Falcons"),
  vitality: team("vitality", "Team Vitality"),
} as const;

const SEASON_TOURNAMENTS = {
  major: {
    event: { id: "major-event", name: "RLCS Major", slug: "rlcs-major" },
    id: "major",
    name: "Playoffs",
    slug: "playoffs",
  },
} satisfies Record<string, SeasonPathTournament>;

const tournamentOf = (id: string) =>
  Object.values(SEASON_TOURNAMENTS).find((tournament) => tournament.id === id) ?? null;

const teamOf = (id: string) =>
  Object.values(SEASON_TEAMS).find((candidate) => candidate.id === id) ?? team(id, id);

export const memorySeasonStore = () => {
  const seasons = new Map<string, SeasonRecord>();
  const awards: StoredAward[] = [];
  const participants: StoredParticipant[] = [];

  const players = new Map<string, SeasonAwardPlayer>([
    ["zen", { id: "zen", mergedIntoId: null, name: "zen" }],
    ["vatira", { id: "vatira", mergedIntoId: null, name: "Vatira" }],
    ["old-zen", { id: "old-zen", mergedIntoId: "zen", name: "zen" }],
  ]);

  const teams = new Map<string, SeasonParticipantTeam>([
    ["vitality", { id: "vitality", mergedIntoId: null, name: "Team Vitality" }],
    ["falcons", { id: "falcons", mergedIntoId: null, name: "Team Falcons" }],
    ["old-vitality", { id: "old-vitality", mergedIntoId: "vitality", name: "Vitality" }],
  ]);

  let sequence = 0;

  const nextId = (prefix: string) => {
    sequence += 1;

    return `${prefix}-${sequence}`;
  };

  const stripAward = ({ seasonId: _seasonId, ...award }: StoredAward) => award;

  const stripParticipant = ({ seasonId: _seasonId, ...participant }: StoredParticipant) => ({
    ...participant,
    path: [...participant.path],
  });

  const store: SeasonStore = {
    awardTaken: async (seasonId, { awardType, region }) =>
      awards.some(
        (award) =>
          award.seasonId === seasonId && award.awardType === awardType && award.region === region,
      ),
    awards: async (seasonId) =>
      awards.flatMap((award) => (award.seasonId === seasonId ? [stripAward(award)] : [])),
    awardsOfPlayer: async (playerId) =>
      awards
        .filter((award) => award.player.id === playerId)
        .flatMap((award) => {
          const season = seasons.get(award.seasonId);
          const { id, awardType, region, presentedBy, sourceUrl } = award;

          return season
            ? [
                {
                  awardType,
                  id,
                  presentedBy,
                  region,
                  season: { id: season.id, name: season.name, slug: season.slug },
                  sourceUrl,
                },
              ]
            : [];
        }),
    find: async (id) => seasons.get(id) ?? null,
    findBySlug: async (slug) =>
      [...seasons.values()].find((season) => season.slug === slug) ?? null,
    list: async () => [...seasons.values()].map(({ id, name, slug }) => ({ id, name, slug })),
    nameTaken: async (name, exceptId) =>
      [...seasons.values()].some((season) => season.name === name && season.id !== exceptId),
    participant: async (seasonId, participantId) => {
      const found = participants.find(
        (participant) => participant.seasonId === seasonId && participant.id === participantId,
      );

      return found ? stripParticipant(found) : null;
    },
    participantTaken: async (seasonId, teamId) =>
      participants.some(
        (participant) => participant.seasonId === seasonId && participant.team.id === teamId,
      ),
    participants: async (seasonId) =>
      participants
        .filter((participant) => participant.seasonId === seasonId)
        .toSorted((a, b) => a.team.name.localeCompare(b.team.name))
        .map(stripParticipant),
    player: async (id) => players.get(id) ?? null,
    published: async () =>
      [...seasons.values()].flatMap(({ id, name, slug, winnerTeamId }) =>
        slug === null
          ? []
          : [
              {
                name,
                slug,
                winner:
                  participants.find(
                    (participant) =>
                      participant.seasonId === id && participant.team.id === winnerTeamId,
                  )?.team ?? null,
              },
            ],
      ),
    remove: async (id) => seasons.delete(id),
    removeAward: async (seasonId, awardId) => {
      const index = awards.findIndex(
        (award) => award.seasonId === seasonId && award.id === awardId,
      );

      if (index === -1) {
        return false;
      }

      awards.splice(index, 1);

      return true;
    },
    removeParticipant: async (seasonId, participantId) => {
      const index = participants.findIndex(
        (participant) => participant.seasonId === seasonId && participant.id === participantId,
      );

      if (index === -1) {
        return false;
      }

      participants.splice(index, 1);

      return true;
    },
    removePathEntry: async (participantId, entryId) => {
      const found = participants.find((participant) => participant.id === participantId);
      const index = found?.path.findIndex((entry) => entry.id === entryId) ?? -1;

      if (!found || index < 0) {
        return false;
      }

      found.path.splice(index, 1);

      return true;
    },
    save: async (season) => {
      seasons.set(season.id, season);
    },
    saveAward: async (seasonId, playerId, fields) => {
      const award: StoredAward = {
        ...fields,
        id: nextId("award"),
        player: { id: playerId, name: playerId, slug: playerId },
        seasonId,
      };

      awards.push(award);

      return stripAward(award);
    },
    saveParticipant: async (seasonId, teamId, pathNote) => {
      const participant: StoredParticipant = {
        id: nextId("participant"),
        path: [],
        pathNote,
        seasonId,
        team: teamOf(teamId),
      };

      participants.push(participant);

      return stripParticipant(participant);
    },
    savePathEntry: async (participantId, { label, result, tournamentId }) => {
      const entry = {
        id: nextId("entry"),
        label,
        result,
        tournament: tournamentId === null ? null : tournamentOf(tournamentId),
      };

      participants.find((participant) => participant.id === participantId)?.path.push(entry);

      return entry;
    },
    slugTaken: async (slug, exceptId) =>
      [...seasons.values()].some((season) => season.slug === slug && season.id !== exceptId),
    team: async (id) => teams.get(id) ?? null,
    tournamentExists: async (id) => tournamentOf(id) !== null,
    updatePathNote: async (participantId, pathNote) => {
      const found = participants.find((participant) => participant.id === participantId);

      if (found) {
        found.pathNote = pathNote;
      }
    },
  };

  return { awards, participants, store };
};
