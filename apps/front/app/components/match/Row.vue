<script lang="ts" setup>
import type { MatchListItem } from "~/types/matches";
const { locale } = useI18n();

const hourDf = new Intl.DateTimeFormat(locale.value, {
  hour: "2-digit",
  minute: "2-digit",
});

const {
  match,
  live = false,
  divider = true,
  result = false,
} = defineProps<{
  match: MatchListItem;
  live?: boolean;
  /** Bottom border between rows. Omit on the last row when a footer owns the separator. */
  divider?: boolean;
  result?: boolean;
}>();
</script>

<template>
  <UiListItem size="default" :divider="divider">
    <div class="grid w-full grid-cols-3 items-center">
      <div
        v-if="match.participants"
        class="col-span-2 flex flex-col gap-0.5 text-xs font-medium text-dimmed truncate"
      >
        <span>
          {{
            match.participants.length > 0
              ? match.participants[0]?.team.name
              : $t("components.match.tbd")
          }}
        </span>
        <span>
          {{
            match.participants.length > 1
              ? match.participants[1]?.team.name
              : $t("components.match.tbd")
          }}
        </span>
      </div>
      <div v-if="!result" class="col-span-1 flex flex-row items-center justify-end">
        <UiBadgeLive v-if="live" />
        <span
          v-else-if="match.beginAt"
          class="text-end text-xs text-muted font-thin col-span-1 tabular-nums"
        >
          {{ hourDf.format(new Date(match.beginAt)) }}
        </span>
      </div>
    </div>
  </UiListItem>
</template>
