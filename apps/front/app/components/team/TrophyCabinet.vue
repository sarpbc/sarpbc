<script lang="ts" setup>
import { DateFormatter } from "@internationalized/date";
import type { TeamTrophyListItem } from "~/composables/team/useTeamTrophies";

const {
  trophies,
  pending = false,
  hasError = false,
} = defineProps<{
  trophies: TeamTrophyListItem[];
  pending?: boolean;
  hasError?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t, locale } = useI18n();

const headingId = "team-trophies-title";

const dateDf = computed(
  () =>
    new DateFormatter(locale.value, {
      dateStyle: "medium",
    }),
);

const formatEndDate = (value: Date | string | null) => {
  if (!value) return null;
  return dateDf.value.format(new Date(value));
};
</script>

<template>
  <section class="w-full flex flex-col gap-3" :aria-labelledby="headingId">
    <h2 :id="headingId" class="text-lg font-semibold tracking-tight pl-1">
      {{ t("page.team.slug.trophies.title") }}
    </h2>

    <div v-if="pending" class="flex flex-col gap-2" aria-live="polite">
      <UiCard v-for="index in 3" :key="index">
        <div class="flex items-center gap-3 py-2 px-3">
          <USkeleton class="size-5 shrink-0" />
          <div class="flex flex-1 flex-col gap-1">
            <USkeleton class="h-3 w-40" />
            <USkeleton class="h-3 w-24" />
          </div>
        </div>
      </UiCard>
    </div>

    <UiCard v-else-if="hasError">
      <div class="flex flex-col items-center gap-3 py-8 px-4 text-center">
        <UIcon name="i-fluent-warning-24-regular" class="text-3xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t("page.team.slug.trophies.error") }}
        </p>
        <UButton variant="outline" color="error" @click="emit('retry')">
          {{ t("page.team.slug.trophies.retry") }}
        </UButton>
      </div>
    </UiCard>

    <div
      v-else-if="trophies.length > 0"
      class="flex flex-col border border-default divide-y divide-default"
    >
      <ULink
        v-for="trophy in trophies"
        :key="trophy.id"
        :to="$localePath(`/tournaments/${trophy.id}`)"
        class="flex items-center gap-3 p-3 hover:bg-elevated"
      >
        <UIcon name="i-fluent-trophy-24-regular" class="text-xl text-primary shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">{{ trophy.name }}</p>
          <p
            v-if="trophy.leagueName || trophy.serie || trophy.endAt"
            class="text-sm text-muted truncate"
          >
            <span v-if="trophy.leagueName">{{ trophy.leagueName }}</span>
            <span v-if="trophy.leagueName && trophy.serie" class="mx-1">·</span>
            <span v-if="trophy.serie">{{ trophy.serie }}</span>
            <span v-if="(trophy.leagueName || trophy.serie) && trophy.endAt" class="mx-1">·</span>
            <span v-if="trophy.endAt">
              {{ t("page.team.slug.trophies.wonOn", { date: formatEndDate(trophy.endAt) }) }}
            </span>
          </p>
        </div>
      </ULink>
    </div>

    <UiCard v-else>
      <div class="flex flex-col items-center gap-2 py-8 px-4 text-center">
        <UIcon name="i-fluent-trophy-24-regular" class="text-3xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t("page.team.slug.trophies.empty") }}
        </p>
        <p class="text-xs text-dimmed text-pretty">
          {{ t("page.team.slug.trophies.emptyHint") }}
        </p>
      </div>
    </UiCard>
  </section>
</template>
