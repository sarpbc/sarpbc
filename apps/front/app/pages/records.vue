<script lang="ts" setup>
import { RECORD_VENUES } from "@sarpbc/types";
import type { RecordBook, RecordVenue } from "@sarpbc/types";
import { playerPath, teamPath, tournamentStageLabel, tournamentStagePath } from "@sarpbc/utils";
import type { RecordRow } from "~/utils/records";

type RecordKey = Exclude<keyof RecordBook, "venue">;

const RECORD_KEYS = [
  "teamTitles",
  "playerTitles",
  "winStreaks",
  "youngestChampions",
] as const satisfies readonly RecordKey[];

const ALL_VENUES = "all";

const { t, locale } = useI18n();
const localePath = useLocalePath();
const route = useRoute();
const { setPageSeo } = useSarpbcSeo();

const isVenue = (value: string): value is RecordVenue =>
  RECORD_VENUES.some((venue) => venue === value);

const venue = computed(() => {
  const value = routeQueryString(route.query.venue);

  return isVenue(value) ? value : null;
});

const venueOptions = computed(() => [
  { label: t("page.records.venue.all"), value: ALL_VENUES },
  { label: t("page.records.venue.lan"), value: "lan" },
  { label: t("page.records.venue.online"), value: "online" },
]);

const setVenue = async (value: string) => {
  await navigateTo(
    { query: { ...route.query, venue: isVenue(value) ? value : undefined } },
    { replace: true },
  );
};

const {
  data: book,
  pending,
  error,
  refresh,
} = await useAsyncData(
  () => `records-${venue.value ?? ALL_VENUES}`,
  () => getRecordBook(venue.value),
  { default: () => null },
);

const dayFormatter = computed(() => mediumCalendarDayFormatter(locale.value));

const day = (value: string) => dayFormatter.value.format(new Date(value));

const dayRange = (from: string, to: string) =>
  from === to ? day(from) : dayFormatter.value.formatRange(new Date(from), new Date(to));

const rowsOf = (record: RecordBook, key: RecordKey) => {
  switch (key) {
    case "teamTitles": {
      return record.teamTitles.map(
        ({ rank, team, titles }) =>
          ({
            key: team.slug,
            label: team.name,
            meta: null,
            metaTo: null,
            rank,
            team,
            to: localePath(teamPath(team.slug)),
            value: t("page.records.titles", { count: titles }),
          }) satisfies RecordRow,
      );
    }

    case "playerTitles": {
      return record.playerTitles.map(
        ({ rank, player, titles }) =>
          ({
            key: player.slug,
            label: player.name,
            meta: null,
            metaTo: null,
            rank,
            team: null,
            to: localePath(playerPath(player.slug)),
            value: t("page.records.titles", { count: titles }),
          }) satisfies RecordRow,
      );
    }

    case "winStreaks": {
      return record.winStreaks.map(
        ({ rank, team, series, from, to }) =>
          ({
            key: team.slug,
            label: team.name,
            meta: dayRange(from, to),
            metaTo: null,
            rank,
            team,
            to: localePath(teamPath(team.slug)),
            value: t("page.records.series", { count: series }),
          }) satisfies RecordRow,
      );
    }

    case "youngestChampions": {
      return record.youngestChampions.map(
        ({ rank, player, age, date, stage }) =>
          ({
            key: player.slug,
            label: player.name,
            meta: `${tournamentStageLabel(stage)} · ${day(date)}`,
            metaTo: localePath(tournamentStagePath(stage.event.slug, stage.slug)),
            rank,
            team: null,
            to: localePath(playerPath(player.slug)),
            value: t("page.records.age", {
              days: t("page.records.days", { count: age.days }),
              years: t("page.records.years", { count: age.years }),
            }),
          }) satisfies RecordRow,
      );
    }

    default: {
      const exhaustive: never = key;

      return exhaustive;
    }
  }
};

const sections = computed(() => {
  const record = book.value;

  return record
    ? RECORD_KEYS.map((key) => ({
        key,
        rows: rowsOf(record, key),
        title: t(`page.records.sections.${key}`),
      }))
    : [];
});

setPageSeo({
  description: t("page.records.description"),
  title: t("page.records.seoTitle"),
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <HubPageHeader>
      <template #title>{{ t("page.records.title") }}</template>
    </HubPageHeader>

    <div class="flex h-row items-center px-2">
      <STabs
        :model-value="venue ?? ALL_VENUES"
        :items="venueOptions"
        :ariaLabel="t('page.records.venue.label')"
        @update:model-value="setVenue"
      />
    </div>

    <HubCard v-if="pending && !book" aria-live="polite">
      <span class="sr-only">{{ t("common.loading") }}</span>
      <HubListItem v-for="index in 6" :key="index" class="gap-3">
        <SSkeleton class="h-3 w-5 shrink-0" />
        <SSkeleton class="h-3 max-w-72 flex-1" />
        <SSkeleton class="h-3 w-16 shrink-0" />
      </HubListItem>
    </HubCard>

    <HubCard v-else-if="error || !book" class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="t('page.records.error')" @retry="refresh()" />
    </HubCard>

    <template v-else>
      <RecordsSection
        v-for="section in sections"
        :key="section.key"
        :title="section.title"
        :rows="section.rows"
      />
    </template>
  </div>
</template>
