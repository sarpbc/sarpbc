<script lang="ts" setup>
const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();

const tournamentId = computed(() => route.params.id as string);

const { data: tournament } = await useLazyAsyncData(
  () => `admin-pickems-tournament-${tournamentId.value}`,
  () => getTournamentById(tournamentId.value),
  { server: false, watch: [tournamentId] },
);

const { data: matches, status } = await useLazyAsyncData(
  () => `admin-pickems-${tournamentId.value}-matches`,
  () => getTournamentMatches(tournamentId.value),
  { server: false, watch: [tournamentId] },
);

const displayMatches = computed(() =>
  (matches.value ?? []).filter((match) => (match.participants?.length ?? 0) === 2),
);

const breadcrumbItems = computed(() => [
  {
    label: t("page.pickems.title"),
    to: localePath("/pickems"),
  },
  {
    label: tournament.value?.name ?? tournamentId.value,
  },
]);
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p v-if="status === 'pending'" class="text-sm text-muted">
          {{ $t("page.pickems.loading") }}
        </p>
        <p v-else class="text-sm text-muted">
          {{ $t("page.pickems.matchesCount", { count: displayMatches.length }) }}
        </p>

        <div
          v-if="displayMatches.length > 0"
          class="divide-y divide-default border-y border-default"
        >
          <div
            v-for="match in displayMatches"
            :key="match.id"
            class="flex min-h-row w-full flex-row items-center py-2"
          >
            <p class="truncate text-sm font-medium text-highlighted">
              {{ match.participants?.[0]?.team.name }} vs
              {{ match.participants?.[1]?.team.name }}
            </p>
          </div>
        </div>

        <div v-else-if="status !== 'pending'" class="py-8 text-center text-sm text-muted">
          {{ $t("page.pickems.noMatches") }}
        </div>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
