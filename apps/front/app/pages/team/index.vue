<script lang="ts" setup>
const { t } = useI18n();
const route = useRoute();
const { setPageSeo } = useSarpbcSeo();

const TEAMS_PER_PAGE = 52;

const offset = computed(() => parseRouteOffset(route.query.offset));

const start = computed(() => routeQueryString(route.query.start).toUpperCase());

const {
  data: teamsResponse,
  pending,
  error,
  refresh,
} = await useLazyAsyncData(
  `teams-${offset.value}-${start.value}`,
  () =>
    getAllTeams({
      limit: TEAMS_PER_PAGE,
      offset: offset.value,
      start: start.value || undefined,
    }),
  {
    watch: [offset, start],
  },
);

const teams = computed(() => teamsResponse.value?.teams || []);
const totalTeams = computed(() => teamsResponse.value?.total || 0);

const currentPage = computed(() => Math.floor(offset.value / TEAMS_PER_PAGE) + 1);
const totalPages = computed(() => Math.ceil(totalTeams.value / TEAMS_PER_PAGE));

const hasPrevious = computed(() => offset.value > 0);
const hasNext = computed(() => offset.value + TEAMS_PER_PAGE < totalTeams.value);

interface HubListQuery {
  offset: string;
  start?: string;
  [key: string]: string | undefined;
}

const previousPageQuery = computed(() => {
  const query: HubListQuery = {
    offset: Math.max(0, offset.value - TEAMS_PER_PAGE).toString(),
  };

  if (start.value) {
    query.start = start.value;
  }

  return query;
});

const nextPageQuery = computed(() => {
  const query: HubListQuery = {
    offset: (offset.value + TEAMS_PER_PAGE).toString(),
  };

  if (start.value) {
    query.start = start.value;
  }

  return query;
});

const getLetterQuery = (letter: string) => {
  const query: HubListQuery = {
    offset: "0",
  };

  if (letter && letter !== "ALL") {
    query.start = letter;
  }

  return query;
};

const pageTitle = computed(() => {
  if (start.value) {
    return t("page.teams.letter.pageTitle", { letter: start.value });
  }

  return t("page.teams.index.pageTitle", { count: totalTeams.value });
});

const description = computed(() => {
  if (start.value) {
    return t("page.teams.letter.description", { letter: start.value });
  }

  return t("page.teams.index.description", { count: totalTeams.value });
});

setPageSeo({
  description: description.value,
  title: start.value
    ? t("page.teams.letter.title", { letter: start.value })
    : t("page.teams.index.title"),
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <HubPageHeader>
      <template #title>{{ pageTitle }}</template>
      <template v-if="totalTeams > 0" #meta>
        <span>{{ t("page.hub.headers.teamsTotal", { count: totalTeams }) }}</span>
      </template>
    </HubPageHeader>

    <div>
      <HubLetterFilter
        :active="start"
        :to="(letter) => ({ path: $localePath('/team'), query: getLetterQuery(letter) })"
      />

      <HubCard v-if="pending" aria-live="polite">
        <HubListItem v-for="index in 8" :key="index" class="gap-3">
          <SbSkeleton class="size-7 shrink-0" />
          <SbSkeleton class="h-3 max-w-40 flex-1" />
          <SbSkeleton class="h-3 w-20" />
        </HubListItem>
      </HubCard>

      <HubCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
        <SbErrorState :message="t('page.teams.index.error')" @retry="refresh()" />
      </HubCard>

      <HubCard v-else-if="teams.length > 0">
        <TeamLink v-for="team in teams" :key="team.id" :team="team" />
      </HubCard>

      <HubCard v-else class="flex min-h-row-stack h-row-grid items-center">
        <SbEmptyState
          icon="i-fluent-shield-dismiss-24-regular"
          :title="t('page.teams.index.noTeamsFound')"
          :hint="start ? t('page.teams.letter.noTeamsStartingWith', { letter: start }) : undefined"
        />
      </HubCard>

      <HubPagination
        v-if="totalPages > 1"
        :current-page="currentPage"
        :total-pages="totalPages"
        :has-previous="hasPrevious"
        :has-next="hasNext"
        :previous-to="{ path: $localePath('/team'), query: previousPageQuery }"
        :next-to="{ path: $localePath('/team'), query: nextPageQuery }"
        class="mt-row"
      />
    </div>
  </div>
</template>
