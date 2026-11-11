<script lang="ts" setup>
import type { EntityKind, EntityTrophyListItem } from "~/types/entity";

const {
  kind,
  trophies,
  pending = false,
  hasError = false,
} = defineProps<{
  kind: EntityKind;
  trophies: EntityTrophyListItem[];
  pending?: boolean;
  hasError?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t, locale } = useI18n();

const headingId = computed(() => `${kind}-trophies-title`);

const mediumDate = computed(() => mediumDateFormatter(locale.value));

const formatEndDate = (value: Date | string | null) => {
  if (!value) return null;
  return mediumDate.value.format(new Date(value));
};
</script>

<template>
  <section :aria-labelledby="headingId">
    <SRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t(`page.${kind}.slug.trophies.title`) }}
        </h2>
      </template>

      <SCard v-if="pending" aria-live="polite">
        <SListItem v-for="index in 3" :key="index">
          <div class="flex w-full min-w-0 items-center gap-2">
            <USkeleton class="size-5 shrink-0" />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <USkeleton class="h-3.5 w-40" />
              <USkeleton class="h-3 w-24" />
            </div>
          </div>
        </SListItem>
      </SCard>

      <SCard v-else-if="hasError">
        <SErrorState :message="t(`page.${kind}.slug.trophies.error`)" @retry="emit('retry')" />
      </SCard>

      <SCard v-else-if="trophies.length > 0">
        <SListItem
          v-for="trophy in trophies"
          :key="trophy.id"
          :to="$localePath(trophy.path)"
          class="min-w-0"
        >
          <div class="flex w-full min-w-0 items-center gap-2">
            <UIcon name="i-fluent-trophy-24-regular" class="size-5 shrink-0 text-primary" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ trophy.displayName }}
                <span v-if="trophy.formatLabel" class="text-xs font-normal text-muted">
                  {{ trophy.formatLabel }}
                </span>
              </p>
              <time
                v-if="trophy.endAt"
                :datetime="new Date(trophy.endAt).toISOString()"
                class="block truncate text-xs text-muted tabular-nums"
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
            {{ t(`page.${kind}.slug.trophies.empty`) }}
          </p>
          <p class="text-xs text-muted text-pretty">
            {{ t(`page.${kind}.slug.trophies.emptyHint`) }}
          </p>
        </div>
      </SCard>
    </SRail>
  </section>
</template>
