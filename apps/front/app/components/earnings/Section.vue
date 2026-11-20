<script lang="ts" setup>
import type { EarningsEntry, ProfileEarnings } from "@sarpbc/types";
import { distinctStageName, tournamentStagePath } from "@sarpbc/utils";

const { owner, ownerId } = defineProps<{
  owner: "player" | "team";
  ownerId: string;
}>();

const { t } = useI18n();
const { formatAmount, formatTotals, formatPlacement } = usePrizeFormat();

const headingId = computed(() => `${owner}-earnings-title`);

const {
  data: earnings,
  pending,
  error,
  refresh,
} = useLazyAsyncData<ProfileEarnings>(
  () => `${owner}-earnings-${ownerId}`,
  () => (owner === "player" ? getPlayerEarnings(ownerId) : getTeamEarnings(ownerId)),
  { default: () => ({ totals: [], years: [] }) },
);

const years = computed(() => earnings.value?.years ?? []);
const totals = computed(() => earnings.value?.totals ?? []);

const entryMeta = (entry: EarningsEntry) => {
  const parts = [distinctStageName(entry.tournament), formatPlacement(entry.placement)];

  if (owner === "player") {
    parts.push(entry.team.name);
  }

  return parts.filter(Boolean).join(" · ");
};
</script>

<template>
  <section :aria-labelledby="headingId">
    <HubRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t("common.prizes.earnings.title") }}
        </h2>
      </template>

      <HubCard v-if="pending" aria-live="polite">
        <HubListItem v-for="index in 3" :key="index">
          <div class="flex w-full min-w-0 items-center gap-2">
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <SSkeleton class="h-3.5 w-3/5 max-w-48" />
              <SSkeleton class="h-3 w-2/5 max-w-32" />
            </div>
            <SSkeleton class="h-3.5 w-16" />
          </div>
        </HubListItem>
      </HubCard>

      <HubCard v-else-if="error">
        <SErrorState :message="t('common.prizes.earnings.error')" @retry="refresh()" />
      </HubCard>

      <HubCard v-else-if="years.length > 0">
        <HubListItem class="justify-between gap-4">
          <span class="text-sm text-muted">{{ t("common.prizes.earnings.total") }}</span>
          <span class="text-sm font-medium text-highlighted tabular-nums">
            {{ formatTotals(totals) }}
          </span>
        </HubListItem>

        <template v-for="year in years" :key="year.year ?? 'undated'">
          <HubListItem class="justify-between gap-4 bg-elevated/50">
            <h3 class="text-sm font-medium tabular-nums">
              {{ year.year ?? t("common.prizes.earnings.undated") }}
            </h3>
            <span class="text-sm text-muted tabular-nums">{{ formatTotals(year.totals) }}</span>
          </HubListItem>
          <HubListItem
            v-for="entry in year.entries"
            :key="entry.id"
            :to="
              $localePath(tournamentStagePath(entry.tournament.event.slug, entry.tournament.slug))
            "
            class="min-w-0 gap-4"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ entry.tournament.event.name }}
              </p>
              <p class="truncate text-xs text-muted">{{ entryMeta(entry) }}</p>
            </div>
            <span class="shrink-0 text-sm tabular-nums">
              {{ formatAmount(entry.amount, entry.currency) }}
            </span>
          </HubListItem>
        </template>

        <p
          v-if="owner === 'player'"
          class="flex min-h-row flex-col justify-center gap-0.5 border-b border-separator px-2 py-2 text-xs text-muted"
        >
          <span>{{ t("common.prizes.earnings.splitHint") }}</span>
        </p>
      </HubCard>

      <HubCard v-else>
        <div class="flex flex-col items-center gap-2 py-8 px-4 text-center">
          <Icon name="i-fluent-money-24-regular" class="text-3xl text-muted" />
          <p class="text-sm text-muted text-pretty">
            {{ t("common.prizes.earnings.empty") }}
          </p>
          <p class="text-xs text-muted text-pretty">
            {{ t("common.prizes.earnings.emptyHint") }}
          </p>
        </div>
      </HubCard>
    </HubRail>
  </section>
</template>
