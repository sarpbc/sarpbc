<script lang="ts" setup>
const MAX_MATCHES = 5;

const { data, pending } = await useUpcomingMatches();

const matches = computed(() => {
  if (!data.value) {
    return [];
  }
  return [...data.value.live, ...data.value.upcoming].slice(0, MAX_MATCHES);
});

const showRail = computed(() => pending.value || matches.value.length > 0);
</script>

<template>
  <div v-if="showRail" class="md:hidden w-full flex flex-col mb-2">
    <UiRail :title="$t('components.match.todaysMatch')">
      <UiCard>
        <div class="w-full flex flex-col">
          <template v-if="pending && matches.length === 0">
            <UiListItem v-for="i in 3" :key="i" size="default" :divider="i < 3">
              <div class="grid w-full grid-cols-3 items-center gap-2">
                <div class="col-span-2 flex flex-col gap-1">
                  <USkeleton class="h-3 max-w-28" />
                  <USkeleton class="h-3 max-w-24" />
                </div>
                <USkeleton class="col-span-1 h-3 w-10 justify-self-end" />
              </div>
            </UiListItem>
          </template>
          <template v-else>
            <ULink
              v-for="(match, index) in matches"
              :key="match.id"
              :to="$localePath(`/matches/${match.id}`)"
              class="block hover:bg-elevated/50 transition-colors"
            >
              <MatchRow
                :match="match"
                :live="data?.live.some((m) => m.id === match.id)"
                :divider="index < matches.length - 1"
              />
            </ULink>
          </template>
        </div>
        <div class="border-t border-default px-3 py-2">
          <ULink
            :to="$localePath('/matches')"
            class="text-sm text-muted hover:text-default transition-colors"
          >
            {{ $t("components.match.viewAll") }}
          </ULink>
        </div>
      </UiCard>
    </UiRail>
  </div>
</template>
