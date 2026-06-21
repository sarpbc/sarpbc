<script lang="ts" setup>
import type { TeamForm } from "~/types/matches";

const { t } = useI18n();

const { teamName, teamForm } = defineProps<{
  teamName: string;
  teamForm?: TeamForm;
}>();

const hasRecentMatches = computed(() => (teamForm?.recent.length ?? 0) > 0);
</script>

<template>
  <UiCard class="p-4">
    <div
      class="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-default pb-3"
    >
      <h3 class="text-sm font-semibold text-balance">{{ teamName }}</h3>
      <span
        v-if="teamForm && hasRecentMatches"
        class="shrink-0 text-sm font-medium text-muted tabular-nums"
      >
        {{
          t("page.match.detail.formRecord", {
            wins: teamForm.record.wins,
            losses: teamForm.record.losses,
          })
        }}
      </span>
    </div>

    <p v-if="!hasRecentMatches" class="text-sm text-pretty text-muted">
      {{ t("page.match.detail.formEmpty") }}
    </p>

    <ul v-else class="flex flex-col gap-1.5">
      <li
        v-for="recentMatch in teamForm!.recent"
        :key="recentMatch.id"
        class="flex items-center justify-between gap-3 rounded-md bg-elevated/50 px-2.5 py-2 text-sm"
      >
        <div class="flex min-w-0 items-center gap-2">
          <UBadge
            v-if="recentMatch.outcome"
            :color="recentMatch.outcome === 'win' ? 'success' : 'error'"
            variant="soft"
            class="shrink-0 tabular-nums"
          >
            {{
              recentMatch.outcome === "win"
                ? t("page.match.detail.win")
                : t("page.match.detail.loss")
            }}
          </UBadge>
          <span class="truncate text-muted">
            {{
              t("page.match.detail.formVs", {
                opponent: recentMatch.opponent.name ?? t("page.match.detail.unknownTeam"),
              })
            }}
          </span>
        </div>
        <span class="shrink-0 font-mono tabular-nums text-toned">
          {{
            t("page.match.detail.formScore", {
              teamScore: recentMatch.score.team ?? "-",
              opponentScore: recentMatch.score.opponent ?? "-",
            })
          }}
        </span>
      </li>
    </ul>
  </UiCard>
</template>
