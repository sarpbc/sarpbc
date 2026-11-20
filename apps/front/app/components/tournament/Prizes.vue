<script lang="ts" setup>
import { teamPath } from "@sarpbc/utils";
import type { TournamentDetail } from "@sarpbc/types";

const { tournament } = defineProps<{
  tournament: TournamentDetail;
}>();

const { t } = useI18n();
const { formatAmount, formatPlacement } = usePrizeFormat();
const { isConcealed } = useSpoilerFree();
const concealed = computed(() => isConcealed({ tournamentId: tournament.id }));

const headingId = computed(() => `tournament-prizes-title-${tournament.id}`);

const {
  data: distribution,
  pending,
  error,
  refresh,
} = useLazyAsyncData(
  () => `tournament-prizes-${tournament.id}`,
  () => getTournamentPrizes(tournament.id),
  {
    default: () => null,
    getCachedData(key, nuxtApp) {
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  },
);

const prizes = computed(() => distribution.value?.prizes ?? []);

const showSection = computed(
  () => pending.value || Boolean(error.value) || prizes.value.length > 0,
);
</script>

<template>
  <section v-if="showSection" class="w-full" :aria-labelledby="headingId">
    <HubRail>
      <template #caption>
        <h2 :id="headingId" class="text-balance">
          {{ t("page.tournaments.id.prizes.title") }}
        </h2>
      </template>

      <HubCard v-if="pending" aria-live="polite">
        <HubListItem v-for="index in 3" :key="index">
          <div class="flex w-full min-w-0 items-center gap-2">
            <SSkeleton class="h-3.5 w-8 shrink-0" />
            <SSkeleton class="size-5 shrink-0" />
            <SSkeleton class="h-3.5 w-2/5 max-w-40" />
            <SSkeleton class="ms-auto h-3.5 w-16" />
          </div>
        </HubListItem>
      </HubCard>

      <HubCard v-else-if="error">
        <SErrorState :message="t('page.tournaments.id.prizes.error')" @retry="refresh()" />
      </HubCard>

      <HubCard v-else>
        <ol>
          <li v-for="prize in prizes" :key="prize.id">
            <HubListItem v-if="concealed" class="min-w-0 gap-2">
              <span class="w-10 shrink-0 text-sm text-muted tabular-nums">
                {{ formatPlacement(prize.placement) }}
              </span>
              <span class="min-w-0 flex-1 truncate text-sm text-muted">
                {{ t("components.spoiler.resultHidden") }}
              </span>
              <span class="shrink-0 text-sm font-medium tabular-nums">
                {{ formatAmount(prize.amount, prize.currency) }}
              </span>
            </HubListItem>
            <HubListItem v-else :to="$localePath(teamPath(prize.team.slug))" class="min-w-0 gap-2">
              <span class="w-10 shrink-0 text-sm text-muted tabular-nums">
                {{ formatPlacement(prize.placement) }}
              </span>
              <TeamImg :team-name="prize.team.name" :logo="prize.team" size="xs" />
              <span class="min-w-0 flex-1 truncate text-sm font-medium text-highlighted">
                {{ prize.team.name }}
              </span>
              <span class="shrink-0 text-sm font-medium tabular-nums">
                {{ formatAmount(prize.amount, prize.currency) }}
              </span>
            </HubListItem>
          </li>
        </ol>
      </HubCard>
    </HubRail>
  </section>
</template>
