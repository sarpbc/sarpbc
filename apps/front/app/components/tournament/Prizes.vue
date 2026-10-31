<script lang="ts" setup>
import type { TournamentDetail } from "@sarpbc/types";
import { STARTGG_URL } from "~/composables/prizes";

const { tournament } = defineProps<{
  tournament: TournamentDetail;
}>();

const { t } = useI18n();
const { formatAmount, formatPlacement } = usePrizeFormat();

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
    <SRail>
      <template #caption>
        <h2 :id="headingId" class="text-balance">
          {{ t("page.tournaments.id.prizes.title") }}
        </h2>
      </template>

      <SCard v-if="pending" flush-bottom flush-top aria-live="polite">
        <SListItem v-for="index in 3" :key="index" divider>
          <div class="flex w-full min-w-0 items-center gap-2">
            <USkeleton class="h-3.5 w-8 shrink-0" />
            <USkeleton class="size-5 shrink-0" />
            <USkeleton class="h-3.5 w-2/5 max-w-40" />
            <USkeleton class="ms-auto h-3.5 w-16" />
          </div>
        </SListItem>
      </SCard>

      <SCard v-else-if="error" flush-top>
        <SErrorState :message="t('page.tournaments.id.prizes.error')" @retry="refresh()" />
      </SCard>

      <SCard v-else flush-bottom flush-top>
        <ol>
          <li v-for="prize in prizes" :key="prize.id">
            <SListItem divider :to="$localePath(`/team/${prize.team.slug}`)" class="min-w-0 gap-2">
              <span class="w-10 shrink-0 text-sm text-muted tabular-nums">
                {{ formatPlacement(prize.placement) }}
              </span>
              <TeamImg
                :team-name="prize.team.name"
                :image-url="prize.team.imageUrl ?? undefined"
                :dark-mode-image-url="prize.team.darkModeImageUrl ?? undefined"
                size="xs"
              />
              <span class="min-w-0 flex-1 truncate text-sm font-medium text-highlighted">
                {{ prize.team.name }}
              </span>
              <span class="shrink-0 text-sm font-medium tabular-nums">
                {{ formatAmount(prize.amount, prize.currency) }}
              </span>
            </SListItem>
          </li>
        </ol>
        <p
          v-if="distribution?.source === 'startgg'"
          class="flex h-row items-center border-b border-default px-2 text-xs text-muted"
        >
          <span>
            {{ t("common.prizes.dataFrom") }}
            <SLink :to="STARTGG_URL" external target="_blank" variant="inline">start.gg</SLink>
          </span>
        </p>
      </SCard>
    </SRail>
  </section>
</template>
