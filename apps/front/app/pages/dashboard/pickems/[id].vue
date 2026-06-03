<script lang="ts" setup>
const route = useRoute();

const tournamentId = computed(() => route.params.id as string);

const { data: matches } = await useLazyAsyncData(
  `admin-tournaments-${tournamentId.value}-matches`,
  () => getTournamentMatches(tournamentId.value),
);
</script>

<template>
  <NuxtLayout name="dashboardheader">
    <DashboardContent>
      <UiCard
        v-for="match in matches?.filter((m) => m.participants?.length === 2)"
        :key="match.id"
        class="w-full flex flex-row items-center justify-between p-2 border-b-0 last:border-b"
      >
        <h2 class="text-lg font-semibold">
          {{ match.participants?.[0]?.team.name }} vs
          {{ match.participants?.[1]?.team.name }}
        </h2>
      </UiCard>
    </DashboardContent>
  </NuxtLayout>
</template>
