import type {
  PlayerTitlesRecord,
  RecordBook,
  RecordPlayer,
  RecordTeam,
  RecordVenue,
  TeamTitlesRecord,
  WinStreakRecord,
  YoungestChampionRecord,
} from "@sarpbc/types";
import { RECORD_TABLE_SIZE } from "@sarpbc/types";
import { SITE_TIME_ZONE, calendarDayIn, formatIsoDay, parseIsoDay } from "@sarpbc/utils";
import { isRedistributable } from "../../common/domain/data-source";
import { ageOn, countTitles, longestWinStreaks, rankTop } from "../domain/records";
import type { AlmanacPlayer, AlmanacSeries, AlmanacTeam, EventTitle, RecordSources } from "./ports";

const RECORD_FORMAT = "3v3";

const toTeam = ({
  name,
  slug,
  imageUrl,
  darkModeImageUrl,
  logoLightUrl,
  logoDarkUrl,
}: AlmanacTeam) =>
  ({ darkModeImageUrl, imageUrl, logoDarkUrl, logoLightUrl, name, slug }) satisfies RecordTeam;

const toPlayer = ({ name, slug }: AlmanacPlayer) => ({ name, slug }) satisfies RecordPlayer;

const parisDay = (at: Date) => calendarDayIn(at, SITE_TIME_ZONE);

const isCounted = (venue: RecordVenue | null) => (title: EventTitle) =>
  title.format === RECORD_FORMAT &&
  !title.nationalTeam &&
  isRedistributable(title.source) &&
  (venue === null || title.venue === venue);

const isCountedSeries = (venue: RecordVenue | null) => (series: AlmanacSeries) =>
  series.format === RECORD_FORMAT &&
  !series.nationalTeams &&
  isRedistributable(series.source) &&
  isRedistributable(series.stageSource) &&
  (venue === null || series.venue === venue);

const teamTitles = (titles: EventTitle[]) =>
  rankTop(
    countTitles(titles.map(({ team }) => (team ? [team] : []))),
    "most",
    RECORD_TABLE_SIZE,
  ).map(
    ({ rank, holder, value }) =>
      ({ rank, team: toTeam(holder), titles: value }) satisfies TeamTitlesRecord,
  );

const playerTitles = (titles: EventTitle[]) =>
  rankTop(countTitles(titles.map(({ players }) => players)), "most", RECORD_TABLE_SIZE).map(
    ({ rank, holder, value }) =>
      ({ player: toPlayer(holder), rank, titles: value }) satisfies PlayerTitlesRecord,
  );

const youngestChampions = (titles: EventTitle[]) => {
  const youngest = new Map<string, Omit<YoungestChampionRecord, "rank"> & { totalDays: number }>();

  for (const { endAt, stage, players } of titles) {
    const on = parisDay(endAt);

    for (const player of players) {
      const born = player.birthday === null ? null : parseIsoDay(player.birthday);

      if (!born) {
        continue;
      }

      const { years, days, totalDays } = ageOn(born, on);
      const known = youngest.get(player.id);

      if (totalDays >= 0 && (!known || totalDays < known.totalDays)) {
        youngest.set(player.id, {
          age: { days, years },
          date: formatIsoDay(on),
          player: toPlayer(player),
          stage,
          totalDays,
        });
      }
    }
  }

  const candidates = [...youngest.values()].map((entry) => ({
    holder: entry,
    name: entry.player.name,
    value: entry.totalDays,
  }));

  return rankTop(candidates, "fewest", RECORD_TABLE_SIZE).map(
    ({ rank, holder: { age, date, player, stage } }) =>
      ({ age, date, player, rank, stage }) satisfies YoungestChampionRecord,
  );
};

export class RecordBookService {
  constructor(private readonly sources: RecordSources) {}

  async book(venue: RecordVenue | null) {
    const [allTitles, allSeries] = await Promise.all([
      this.sources.eventTitles(),
      this.sources.decidedSeries(),
    ]);

    const titles = allTitles.filter(isCounted(venue));

    return {
      playerTitles: playerTitles(titles),
      teamTitles: teamTitles(titles),
      venue,
      winStreaks: await this.winStreaks(allSeries.filter(isCountedSeries(venue))),
      youngestChampions: youngestChampions(titles),
    } satisfies RecordBook;
  }

  private async winStreaks(series: AlmanacSeries[]) {
    const all = longestWinStreaks(series);
    const lengths = all.map((streak) => streak.series).toSorted((a, b) => b - a);
    const threshold = lengths[RECORD_TABLE_SIZE - 1] ?? 0;
    const streaks = all.filter((streak) => streak.series >= threshold);

    const loaded = await this.sources.teams(streaks.map(({ teamId }) => teamId));
    const teams = new Map(loaded.map((team) => [team.id, team]));

    const candidates = streaks.flatMap((streak) => {
      const team = teams.get(streak.teamId);

      return team ? [{ holder: { streak, team }, name: team.name, value: streak.series }] : [];
    });

    return rankTop(candidates, "most", RECORD_TABLE_SIZE).map(
      ({ rank, holder: { streak, team } }) =>
        ({
          from: formatIsoDay(parisDay(streak.from)),
          rank,
          series: streak.series,
          team: toTeam(team),
          to: formatIsoDay(parisDay(streak.to)),
        }) satisfies WinStreakRecord,
    );
  }
}
