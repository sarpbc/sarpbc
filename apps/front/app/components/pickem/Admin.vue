<script lang="ts" setup>
const colorMode = useColorMode();
const isLight = computed(() => colorMode.value === "light");

const { data: tournaments } = await useLazyAsyncData("admin-tournaments-limit-20", () =>
  getAllTournaments({ limit: 20 }),
);
</script>

<template>
  <UiCard
    v-for="tournament in tournaments"
    :key="tournament.id"
    class="w-full flex flex-row items-center justify-between p-2 border-b-0 last:border-b"
  >
    <div class="flex flex-col gap-1">
      <h2 class="text-lg font-semibold">
        {{ tournament.league?.name }}
        {{ new Date(tournament.beginAt ?? new Date()).getFullYear() }}
        {{ tournament.name }}
      </h2>
      <div v-if="tournament.participants" class="flex flex-row gap-1">
        <div v-for="participant in tournament.participants" :key="participant.id" class="size-fit">
          <img
            v-if="participant.team?.imageUrl"
            :src="participant.team.imageUrl"
            alt="Participant Avatar"
            class="size-4"
            :style="
              !isLight && participant.team.imageUrl.includes('lightmode')
                ? 'filter: invert(1);'
                : ''
            "
          />
        </div>
      </div>
    </div>
    <div class="flex flex-row gap-2">
      <UButton
        variant="soft"
        :to="$localePath(`/dashboard/pickems/${tournament.id}`)"
        class="cursor-pointer"
        title="Expand"
        icon="i-fluent-arrow-expand-24-regular"
      />
      <UButton
        variant="soft"
        class="cursor-pointer"
        title="Sync Tournament"
        icon="i-fluent-arrow-sync-24-regular"
        @click="syncTournament(tournament.id)"
      />
      <UButton
        variant="soft"
        class="cursor-pointer"
        icon="i-fluent-predictions-24-regular"
        title="Enable Pick'ems"
        @click="setTournamentPickemsEnabled(tournament.id, true)"
      />
    </div>
  </UiCard>
</template>
