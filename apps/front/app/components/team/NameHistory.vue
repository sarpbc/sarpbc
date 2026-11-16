<script lang="ts" setup>
import type { TeamAlias } from "@sarpbc/types";

const { aliases } = defineProps<{
  aliases: TeamAlias[];
}>();

const { t, locale } = useI18n();

const headingId = useId();

const dayFormatter = computed(() => mediumCalendarDayFormatter(locale.value));

const formatDay = (day: string) => dayFormatter.value.format(new Date(`${day}T00:00:00Z`));

const period = (alias: TeamAlias) =>
  `${formatDay(alias.from)} – ${alias.to ? formatDay(alias.to) : t("page.team.slug.nameHistory.present")}`;

const newestFirst = computed(() => aliases.toSorted((a, b) => b.from.localeCompare(a.from)));
</script>

<template>
  <section :aria-labelledby="headingId">
    <HubRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t("page.team.slug.nameHistory.title") }}
        </h2>
      </template>
      <ul
        class="m-0 flex list-none flex-col divide-y divide-separator border-x border-b border-separator p-0"
      >
        <li
          v-for="alias in newestFirst"
          :key="alias.id"
          class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-3"
        >
          <span class="font-medium text-highlighted">{{ alias.name }}</span>
          <span class="flex items-baseline gap-3 text-sm text-muted">
            <span>{{ period(alias) }}</span>
            <SLink
              :to="alias.sourceUrl"
              variant="secondary"
              external
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              {{ t("page.team.slug.nameHistory.source") }}
            </SLink>
          </span>
        </li>
      </ul>
    </HubRail>
  </section>
</template>
