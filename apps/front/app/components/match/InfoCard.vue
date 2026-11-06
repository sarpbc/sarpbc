<script setup lang="ts">
import { stageMatchesPath, tournamentStageLabel } from "@sarpbc/utils";
import type { Match } from "~/types/matches";

const { match } = defineProps<{ match: Match }>();

const { t } = useI18n();

const tournamentMatchesPath = computed(() =>
  stageMatchesPath(match.tournament.event.slug, match.tournament.slug),
);

const facts = computed(() => {
  const round = match.name.includes(": ") ? match.name.split(": ")[0] : null;
  return [
    round ? { label: t("page.match.detail.info.round"), value: round } : null,
    match.numberOfGames
      ? {
          label: t("page.match.detail.info.format"),
          value: t("page.match.detail.format", { count: match.numberOfGames }),
        }
      : null,
  ].filter((fact) => fact !== null);
});
</script>

<template>
  <SCard>
    <dl class="flex flex-col">
      <SListItem class="justify-between gap-4 text-sm">
        <dt class="shrink-0 text-muted">{{ t("page.match.detail.info.event") }}</dt>
        <dd class="min-w-0">
          <SLink :to="$localePath(tournamentMatchesPath)" variant="muted" class="block truncate">
            {{ tournamentStageLabel(match.tournament) }}
          </SLink>
        </dd>
      </SListItem>
      <SListItem v-for="fact in facts" :key="fact.label" class="justify-between gap-4 text-sm">
        <dt class="text-muted">{{ fact.label }}</dt>
        <dd class="truncate text-highlighted tabular-nums">{{ fact.value }}</dd>
      </SListItem>
    </dl>
  </SCard>
</template>
