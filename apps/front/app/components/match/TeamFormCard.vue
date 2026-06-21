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
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h3 class="text-sm font-semibold">{{ teamName }}</h3>
      <span v-if="teamForm && hasRecentMatches" class="text-sm text-muted tabular-nums">
        {{
          t("page.match.detail.formRecord", {
            wins: teamForm.record.wins,
            losses: teamForm.record.losses,
          })
        }}
      </span>
    </div>

    <p v-if="!hasRecentMatches" class="text-sm text-muted">
      {{ t("page.match.detail.formEmpty") }}
    </p>

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="recentMatch in teamForm!.recent"
        :key="recentMatch.id"
        class="flex items-center justify-between gap-3 text-sm"
      >
        <div class="flex items-center gap-2 min-w-0">
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
        <span class="shrink-0 font-mono tabular-nums text-muted">
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
