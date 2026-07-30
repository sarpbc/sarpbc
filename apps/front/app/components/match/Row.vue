<script lang="ts" setup>
import type { Match } from "~/types/matches";
const { locale } = useI18n();

const hourDf = new Intl.DateTimeFormat(locale.value, {
  hour: "2-digit",
  minute: "2-digit",
});

const {
  match,
  live = false,
  last = false,
  result = false,
} = defineProps<{
  match: Match;
  live?: boolean;
  last?: boolean;
  result?: boolean;
}>();
</script>

<template>
  <UiListItem size="default" :divider="!last">
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
