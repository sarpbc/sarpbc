<script setup lang="ts">
import type { Viewership, ViewershipScope } from "@sarpbc/types";
import { STARTGG_URL } from "~/composables/prizes";

const { viewership, startgg } = defineProps<{
  viewership: Viewership;
  startgg: boolean;
}>();

const { t, locale } = useI18n();

const numberFormatter = computed(() => new Intl.NumberFormat(locale.value));

const dateTimeFormatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }),
);

const scopeLabel = (scope: ViewershipScope): string => {
  switch (scope) {
    case "official": {
      return t("components.viewership.scope.official");
    }

    case "with_costreams": {
      return t("components.viewership.scope.withCostreams");
    }

    default: {
      const _exhaustive: never = scope;

      return _exhaustive;
    }
  }
};

const stats = computed(() => {
  const rows = [
    {
      key: "peak",
      label: t("components.viewership.peak"),
      value: numberFormatter.value.format(viewership.peakViewers),
    },
  ];

  if (viewership.averageViewers !== null) {
    rows.push({
      key: "average",
      label: t("components.viewership.average"),
      value: numberFormatter.value.format(viewership.averageViewers),
    });
  }

  return rows;
});

const details = computed(() =>
  [
    scopeLabel(viewership.scope),
    viewership.measuredAt
      ? t("components.viewership.measuredAt", {
          date: dateTimeFormatter.value.format(new Date(viewership.measuredAt)),
        })
      : null,
  ]
    .filter(Boolean)
    .join(" · "),
);
</script>

<template>
  <SCard>
    <dl class="grid grid-cols-2 border-b border-separator">
      <div
        v-for="stat in stats"
        :key="stat.key"
        class="flex flex-col gap-1 px-4 py-3 first:border-r first:border-separator"
      >
        <dt class="text-xs text-muted">{{ stat.label }}</dt>
        <dd class="text-2xl text-highlighted tabular-nums">{{ stat.value }}</dd>
      </div>
    </dl>
    <p class="flex min-h-row items-center px-4 text-sm text-muted">{{ details }}</p>
    <p class="flex min-h-row flex-wrap items-center gap-x-4 px-4 text-xs text-muted">
      <span>
        {{ t("components.viewership.source") }}
        <SLink
          :to="viewership.sourceUrl"
          external
          target="_blank"
          rel="noopener noreferrer nofollow"
          variant="inline"
        >
          {{ viewership.sourceName }}
        </SLink>
      </span>
      <span v-if="startgg">
        {{ t("common.prizes.dataFrom") }}
        <SLink :to="STARTGG_URL" external target="_blank" variant="inline">start.gg</SLink>
      </span>
    </p>
  </SCard>
</template>
