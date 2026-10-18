<script lang="ts" setup>
const { t } = useI18n();
const route = useRoute();
const { setPageSeo } = useSarpbcSeo();

const TEAMS_PER_PAGE = 52;

const offset = computed(() => {
  const param = route.query.offset as string;
  return param ? parseInt(param, 10) : 0;
});

const start = computed(() => {
  const param = route.query.start as string;
  return param?.toUpperCase() || "";
});

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

type HubListQuery = {
  offset: string;
  start?: string;
};

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
  title: start.value
    ? t("page.teams.letter.title", { letter: start.value })
    : t("page.teams.index.title"),
  description: description.value,
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>{{ pageTitle }}</template>
      <template v-if="totalTeams > 0" #meta>
        <span>{{ t("page.hub.headers.teamsTotal", { count: totalTeams }) }}</span>
      </template>
    </SHubPageHeader>

    <div>
      <SLetterFilter
        :active="start"
        :to="(letter) => ({ path: $localePath('/team'), query: getLetterQuery(letter) })"
      />

      <SCard v-if="pending" flush-bottom flush-top aria-live="polite">
        <SListItem v-for="index in 8" :key="index" divider class="gap-3">
          <USkeleton class="size-7 shrink-0" />
          <USkeleton class="h-3 max-w-40 flex-1" />
          <USkeleton class="h-3 w-20" />
        </SListItem>
      </SCard>

      <SCard v-else-if="error" flush-top class="flex min-h-row-stack h-row-grid items-center">
        <SErrorState :message="t('page.teams.index.error')" @retry="refresh()" />
      </SCard>

      <SCard v-else-if="teams.length > 0" flush-bottom flush-top>
        <TeamLink v-for="team in teams" :key="team.id" :team="team" />
      </SCard>

      <SCard v-else flush-top class="flex min-h-row-stack h-row-grid items-center">
        <SEmptyState
          icon="i-fluent-shield-dismiss-24-regular"
          :title="t('page.teams.index.noTeamsFound')"
          :hint="start ? t('page.teams.letter.noTeamsStartingWith', { letter: start }) : undefined"
        />
      </SCard>

      <SPagination
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
