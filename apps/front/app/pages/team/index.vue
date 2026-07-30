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

const { data: teamsResponse, pending } = await useLazyAsyncData(
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

const allLetters = computed(() => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  return [...letters, "123"];
});

const currentPage = computed(() => Math.floor(offset.value / TEAMS_PER_PAGE) + 1);
const totalPages = computed(() => Math.ceil(totalTeams.value / TEAMS_PER_PAGE));

const hasPrevious = computed(() => offset.value > 0);
const hasNext = computed(() => offset.value + TEAMS_PER_PAGE < totalTeams.value);

const previousPageQuery = computed(() => {
  const query: Record<string, string> = {
    offset: Math.max(0, offset.value - TEAMS_PER_PAGE).toString(),
  };
  if (start.value) {
    query.start = start.value;
  }
  return query;
});

const nextPageQuery = computed(() => {
  const query: Record<string, string> = {
    offset: (offset.value + TEAMS_PER_PAGE).toString(),
  };
  if (start.value) {
    query.start = start.value;
  }
  return query;
});

const getLetterQuery = (letter: string) => {
  const query: Record<string, string> = {
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
  title: pageTitle.value,
  description: description.value,
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiCrossCard class="h-row-header">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-xl font-semibold">
          {{ pageTitle }}
        </h1>
      </div>
    </UiCrossCard>

    <UiCard>
      <div class="flex flex-wrap gap-1 p-1.5">
        <UButton
          variant="soft"
          :color="!start ? 'primary' : 'neutral'"
          :to="{ path: $localePath('/team'), query: getLetterQuery('') }"
          class="h-6 p-0! px-2! flex justify-center items-center"
        >
          {{ t("common.all") || "ALL" }}
        </UButton>
        <UButton
          v-for="letter in allLetters"
          :key="letter"
          variant="soft"
          :color="start === letter ? 'primary' : 'neutral'"
          :to="{ path: $localePath('/team'), query: getLetterQuery(letter) }"
          class="size-6 p-0! flex justify-center items-center"
        >
          {{ letter }}
        </UButton>
      </div>
    </UiCard>

    <div v-if="pending" class="w-full flex justify-center py-16">
      <div class="flex items-center gap-3">
        <div class="animate-spin rounded-full size-6 border-b-2 border-primary" />
      </div>
    </div>

    <UiCard v-else-if="teams.length > 0">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1 p-2">
        <TeamLink v-for="team in teams" :key="team.id" :team="team" />
      </div>
    </UiCard>

    <UiCard v-else>
      <div class="text-center py-16">
        <UIcon name="i-fluent-shield-dismiss-24-regular" class="text-6xl text-muted mb-4" />
        <p class="text-xl text-muted mb-2">
          {{ t("page.teams.index.noTeamsFound") }}
        </p>
        <p v-if="start" class="text-sm text-muted mb-4">
          {{
            t("page.teams.letter.noTeamsStartingWith", {
              letter: start,
            })
          }}
        </p>
      </div>
    </UiCard>

    <UiCard v-if="teams.length > 0" class="flex justify-between items-center p-1.5">
      <UButton
        :disabled="!hasPrevious"
        variant="soft"
        :to="{ path: $localePath('/team'), query: previousPageQuery }"
      >
        <UIcon name="i-fluent-chevron-left-24-regular" />
        {{ t("common.previous") }}
      </UButton>

      <div class="text-sm text-muted">
        {{ t("page.teams.index.page") }} {{ currentPage }} /
        {{ totalPages }}
      </div>

      <UButton
        :disabled="!hasNext"
        variant="soft"
        :to="{ path: $localePath('/team'), query: nextPageQuery }"
      >
        {{ t("common.next") }}
        <UIcon name="i-fluent-chevron-right-24-regular" />
      </UButton>
    </UiCard>
  </div>
</template>
