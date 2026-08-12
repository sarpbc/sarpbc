<script lang="ts" setup>
import { DateFormatter } from "@internationalized/date";
import type { PlayerTrophyListItem } from "~/composables/player/usePlayerTrophies";

const {
  trophies,
  pending = false,
  hasError = false,
} = defineProps<{
  trophies: PlayerTrophyListItem[];
  pending?: boolean;
  hasError?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t, locale } = useI18n();

const headingId = "player-trophies-title";

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

const hasMeta = (trophy: PlayerTrophyListItem) =>
  Boolean(trophy.leagueName || trophy.serie || trophy.endAt);
</script>

<template>
  <section :aria-labelledby="headingId">
    <SRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t("page.player.slug.trophies.title") }}
        </h2>
      </template>

      <div v-if="pending" class="flex flex-col gap-2" aria-live="polite">
        <SCard v-for="index in 3" :key="index">
          <div class="flex items-center gap-3 py-2 px-3">
            <USkeleton class="size-10 shrink-0" />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <USkeleton class="h-4 w-3/5 max-w-48" />
              <USkeleton class="h-3 w-2/5 max-w-32" />
            </div>
          </div>
        </SCard>
      </div>

      <SCard v-else-if="hasError">
        <div class="flex flex-col items-center gap-3 py-8 px-4 text-center">
          <UIcon name="i-fluent-warning-24-regular" class="text-3xl text-muted" />
          <p class="text-sm text-muted text-pretty">
            {{ t("page.player.slug.trophies.error") }}
          </p>
          <UButton variant="outline" color="error" @click="emit('retry')">
            {{ t("page.player.slug.trophies.retry") }}
          </UButton>
        </div>
      </SCard>

      <div
        v-else-if="trophies.length > 0"
        class="flex flex-col border border-default divide-y divide-default"
      >
        <ULink
          v-for="trophy in trophies"
          :key="trophy.id"
          :to="$localePath(`/tournaments/${trophy.id}`)"
          class="flex items-center gap-3 p-3 hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        >
          <div class="flex size-10 shrink-0 items-center justify-center">
            <UIcon name="i-fluent-trophy-24-regular" class="text-xl text-primary" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">{{ trophy.name }}</p>
            <p v-if="hasMeta(trophy)" class="text-sm text-muted truncate">
              <span v-if="trophy.leagueName">{{ trophy.leagueName }}</span>
              <span v-if="trophy.leagueName && trophy.serie" class="mx-1" aria-hidden="true"
                >·</span
              >
              <span v-if="trophy.serie">{{ trophy.serie }}</span>
              <span
                v-if="(trophy.leagueName || trophy.serie) && trophy.endAt"
                class="mx-1"
                aria-hidden="true"
                >·</span
              >
              <span v-if="trophy.endAt">
                {{ t("page.player.slug.trophies.wonOn", { date: formatEndDate(trophy.endAt) }) }}
              </span>
            </p>
          </div>
        </ULink>
      </div>

      <SCard v-else>
        <div class="flex flex-col items-center gap-2 py-8 px-4 text-center">
          <UIcon name="i-fluent-trophy-24-regular" class="text-3xl text-muted" />
          <p class="text-sm text-muted text-pretty">
            {{ t("page.player.slug.trophies.empty") }}
          </p>
          <p class="text-xs text-dimmed text-pretty">
            {{ t("page.player.slug.trophies.emptyHint") }}
          </p>
        </div>
      </SCard>
    </SRail>
  </section>
</template>
