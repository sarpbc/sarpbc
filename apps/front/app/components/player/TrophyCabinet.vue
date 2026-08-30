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
</script>

<template>
  <section :aria-labelledby="headingId">
    <SRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t("page.player.slug.trophies.title") }}
        </h2>
      </template>

      <SCard v-if="pending" flush-bottom aria-live="polite">
        <SListItem v-for="index in 3" :key="index" divider>
          <div class="flex w-full min-w-0 items-center gap-2">
            <USkeleton class="size-5 shrink-0" />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <USkeleton class="h-3.5 w-3/5 max-w-48" />
              <USkeleton class="h-3 w-2/5 max-w-32" />
            </div>
          </div>
        </SListItem>
      </SCard>

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

      <SCard v-else-if="trophies.length > 0" flush-bottom>
        <SListItem
          v-for="trophy in trophies"
          :key="trophy.id"
          divider
          :to="$localePath(`/tournaments/${trophy.id}`)"
          class="min-w-0"
        >
          <div class="flex w-full min-w-0 items-center gap-2">
            <UIcon name="i-fluent-trophy-24-regular" class="size-5 shrink-0 text-primary" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium leading-none text-highlighted">
                {{ trophy.displayName }}
              </p>
              <time
                v-if="trophy.endAt"
                :datetime="new Date(trophy.endAt).toISOString()"
                class="block truncate text-xs leading-none text-dimmed tabular-nums"
              >
                {{ formatEndDate(trophy.endAt) }}
              </time>
            </div>
          </div>
        </SListItem>
      </SCard>

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
