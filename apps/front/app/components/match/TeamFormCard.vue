<script lang="ts" setup>
import type { TeamForm } from "~/types/matches";

const { t } = useI18n();
const localePath = useLocalePath();

const { teamName, teamForm } = defineProps<{
  teamName: string;
  teamForm?: TeamForm;
}>();

const hasRecentMatches = computed(() => (teamForm?.recent.length ?? 0) > 0);
</script>

<template>
  <SCard flush-bottom class="flex flex-col">
    <SListItem size="default" divider class="min-w-0">
      <div class="flex w-full min-w-0 items-center justify-between gap-3 text-xs font-medium">
        <h3 class="min-w-0 truncate text-toned">{{ teamName }}</h3>
        <span v-if="teamForm && hasRecentMatches" class="shrink-0 text-muted tabular-nums">
          {{
            t("page.match.detail.formRecord", {
              wins: teamForm.record.wins,
              losses: teamForm.record.losses,
            })
          }}
        </span>
      </div>
    </SListItem>

    <SListItem v-if="!hasRecentMatches" size="default" divider>
      <p class="text-xs text-pretty text-muted">
        {{ t("page.match.detail.formEmpty") }}
      </p>
    </SListItem>

    <SListItem
      v-for="recentMatch in teamForm?.recent ?? []"
      :key="recentMatch.id"
      size="default"
      divider
      :to="localePath(`/matches/${recentMatch.id}`)"
      class="min-w-0"
    >
      <div class="flex w-full min-w-0 items-center justify-between gap-3 text-xs font-medium">
        <div class="flex min-w-0 items-center gap-2">
          <UBadge
            v-if="recentMatch.outcome"
            :color="recentMatch.outcome === 'win' ? 'success' : 'error'"
            variant="soft"
            size="sm"
            class="inline-flex size-5 shrink-0 items-center justify-center p-0"
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
      </div>
    </SListItem>
  </SCard>
</template>
