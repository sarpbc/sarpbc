import type {
  SeasonAward,
  SeasonParticipant,
  SeasonPathTournament,
  SeasonTeam,
} from "@sarpbc/types";
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

const team = (id: string, name: string): SeasonTeam => ({
  id,
  name,
  slug: id,
  imageUrl: null,
  darkModeImageUrl: null,
});

export const SEASON_TEAMS = {
  vitality: team("vitality", "Team Vitality"),
  falcons: team("falcons", "Team Falcons"),
} as const;

export const SEASON_TOURNAMENTS = {
  major: {
    id: "major",
    name: "Playoffs",
    slug: "playoffs",
    source: "pandascore",
    event: { id: "major-event", slug: "rlcs-major", name: "RLCS Major" },
  },
  open: {
    id: "open",
    name: "Open Qualifier",
    slug: "open-qualifier",
    source: "startgg",
    event: { id: "open-event", slug: "community-open", name: "Community Open" },
  },
} satisfies Record<string, SeasonPathTournament>;

function tournamentOf(id: string): SeasonPathTournament | null {
  return Object.values(SEASON_TOURNAMENTS).find((tournament) => tournament.id === id) ?? null;
}

export function memorySeasonStore() {
  const seasons = new Map<string, SeasonRecord>();
  const awards: StoredAward[] = [];
  const participants: StoredParticipant[] = [];

  const players = new Map<string, SeasonAwardPlayer>([
    ["zen", { id: "zen", name: "zen", mergedIntoId: null }],
    ["vatira", { id: "vatira", name: "Vatira", mergedIntoId: null }],
    ["old-zen", { id: "old-zen", name: "zen", mergedIntoId: "zen" }],
  ]);

  const teams = new Map<string, SeasonParticipantTeam>([
    ["vitality", { id: "vitality", name: "Team Vitality", mergedIntoId: null }],
    ["falcons", { id: "falcons", name: "Team Falcons", mergedIntoId: null }],
    ["old-vitality", { id: "old-vitality", name: "Vitality", mergedIntoId: "vitality" }],
  ]);

  let sequence = 0;
  const nextId = (prefix: string) => `${prefix}-${++sequence}`;
  const stripAward = ({ seasonId: _seasonId, ...award }: StoredAward): SeasonAward => award;

  const stripParticipant = ({
    seasonId: _seasonId,
    ...participant
  }: StoredParticipant): SeasonParticipant => ({ ...participant, path: [...participant.path] });

  const teamOf = (id: string): SeasonTeam =>
    Object.values(SEASON_TEAMS).find((candidate) => candidate.id === id) ?? team(id, id);

  const store: SeasonStore = {
    list: async () => [...seasons.values()].map(({ id, name, slug }) => ({ id, name, slug })),
    published: async () =>
      [...seasons.values()].flatMap(({ id, name, slug, winnerTeamId }) =>
        slug !== null
          ? [
              {
                slug,
                name,
                winner:
                  participants.find(
                    (participant) =>
                      participant.seasonId === id && participant.team.id === winnerTeamId,
                  )?.team ?? null,
              },
            ]
          : [],
      ),
    find: async (id) => seasons.get(id) ?? null,
    findBySlug: async (slug) =>
      [...seasons.values()].find((season) => season.slug === slug) ?? null,
    nameTaken: async (name, exceptId) =>
      [...seasons.values()].some((season) => season.name === name && season.id !== exceptId),
    slugTaken: async (slug, exceptId) =>
      [...seasons.values()].some((season) => season.slug === slug && season.id !== exceptId),
    save: async (season) => {
      seasons.set(season.id, season);
    },
    remove: async (id) => seasons.delete(id),
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
                  id,
                  awardType,
                  region,
                  presentedBy,
                  sourceUrl,
                  season: { id: season.id, name: season.name, slug: season.slug },
                },
              ]
            : [];
        }),
    player: async (id) => players.get(id) ?? null,
    awardTaken: async (seasonId, { awardType, region }) =>
      awards.some(
        (award) =>
          award.seasonId === seasonId && award.awardType === awardType && award.region === region,
      ),
    saveAward: async (seasonId, playerId, fields) => {
      const award: StoredAward = {
        ...fields,
        id: nextId("award"),
        seasonId,
        player: { id: playerId, name: playerId, slug: playerId },
      };

      awards.push(award);

      return stripAward(award);
    },
    removeAward: async (seasonId, awardId) => {
      const index = awards.findIndex(
        (award) => award.seasonId === seasonId && award.id === awardId,
      );

      if (index < 0) return false;
      awards.splice(index, 1);

      return true;
    },
    team: async (id) => teams.get(id) ?? null,
    tournamentExists: async (id) => tournamentOf(id) !== null,
    participants: async (seasonId) =>
      participants
        .filter((participant) => participant.seasonId === seasonId)
        .sort((a, b) => a.team.name.localeCompare(b.team.name))
        .map(stripParticipant),
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
    saveParticipant: async (seasonId, teamId, pathNote) => {
      const participant: StoredParticipant = {
        id: nextId("participant"),
        seasonId,
        team: teamOf(teamId),
        pathNote,
        path: [],
      };

      participants.push(participant);

      return stripParticipant(participant);
    },
    updatePathNote: async (participantId, pathNote) => {
      const found = participants.find((participant) => participant.id === participantId);

      if (found) found.pathNote = pathNote;
    },
    removeParticipant: async (seasonId, participantId) => {
      const index = participants.findIndex(
        (participant) => participant.seasonId === seasonId && participant.id === participantId,
      );

      if (index < 0) return false;
      participants.splice(index, 1);

      return true;
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
    removePathEntry: async (participantId, entryId) => {
      const found = participants.find((participant) => participant.id === participantId);
      const index = found?.path.findIndex((entry) => entry.id === entryId) ?? -1;

      if (!found || index < 0) return false;
      found.path.splice(index, 1);

      return true;
    },
  };

  return { store, awards, participants };
}
