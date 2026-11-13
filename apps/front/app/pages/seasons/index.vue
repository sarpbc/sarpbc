<script lang="ts" setup>
import { seasonArchivePath } from "@sarpbc/utils";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const {
  data: seasons,
  pending,
  error,
  refresh,
} = await useAsyncData("season-archives-index", () => getSeasonArchives(), {
  default: () => [],
});

setPageSeo({
  title: t("page.seasons.index.seoTitle"),
  description: t("page.seasons.index.description"),
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>{{ t("page.seasons.index.title") }}</template>
    </SHubPageHeader>

    <div>
      <SCard v-if="pending && !seasons.length" aria-live="polite">
        <span class="sr-only">{{ t("common.loading") }}</span>
        <SListItem v-for="index in 3" :key="index">
          <div class="flex w-full min-w-0 flex-col gap-2">
            <USkeleton class="h-3 w-40" />
            <USkeleton class="h-3 w-64 max-w-full" />
          </div>
        </SListItem>
      </SCard>

      <SCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
        <SErrorState :message="t('page.seasons.index.error')" @retry="refresh()" />
      </SCard>

      <SCard v-else-if="seasons.length">
        <ul>
          <li v-for="season in seasons" :key="season.slug">
            <SListItem :to="$localePath(seasonArchivePath(season.slug))" class="min-w-0">
              <div class="flex w-full min-w-0 flex-col">
                <span class="truncate text-sm font-medium text-highlighted">
                  {{ season.name }}
                </span>
                <span class="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                  <template v-if="season.winner">
                    <TeamImg :team-name="season.winner.name" :logo="season.winner" size="xs" />
                    <span class="truncate" translate="no">
                      {{ t("page.seasons.index.winner", { name: season.winner.name }) }}
                    </span>
                  </template>
                  <span v-else>{{ t("page.seasons.index.noWinner") }}</span>
                </span>
              </div>
            </SListItem>
          </li>
        </ul>
      </SCard>

      <SCard v-else class="flex min-h-row-stack h-row-grid items-center">
        <SEmptyState
          icon="i-fluent-calendar-ltr-24-regular"
          :title="t('page.seasons.index.empty')"
          :hint="t('page.seasons.index.emptyHint')"
        />
      </SCard>
    </div>
  </div>
</template>
