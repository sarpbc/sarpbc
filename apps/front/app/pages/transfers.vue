<script lang="ts" setup>
import { TRANSFER_TYPES } from "@sarpbc/types";
import type { LocationQueryRaw } from "vue-router";
import type { TransferType } from "~/types/transfer";

const TRANSFERS_PER_PAGE = 25;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const { setPageSeo } = useSarpbcSeo();

function queryString(key: string): string | undefined {
  const value = route.query[key];
  return value && !Array.isArray(value) ? value : undefined;
}

function isTransferType(value: string | undefined): value is TransferType {
  return TRANSFER_TYPES.some((type) => type === value);
}

function isTransferPeriod(value: string | undefined): value is TransferPeriod {
  return TRANSFER_PERIODS.some((period) => period === value);
}

const type = computed(() => {
  const value = queryString("type");
  return isTransferType(value) ? value : undefined;
});
const period = computed<TransferPeriod>(() => {
  const value = queryString("period");
  return isTransferPeriod(value) ? value : "all";
});
const team = computed(() => queryString("team"));
const player = computed(() => queryString("player"));
const offset = computed(() => {
  const value = Number.parseInt(queryString("offset") ?? "0", 10);
  return Number.isNaN(value) || value < 0 ? 0 : value;
});

const filters = computed(() => ({
  type: type.value,
  period: period.value,
  team: team.value,
  player: player.value,
}));

const { data, pending, error, refresh } = await useAsyncData(
  () => `transfers-${JSON.stringify({ ...filters.value, offset: offset.value })}`,
  () =>
    getTransfers({
      type: filters.value.type,
      team: filters.value.team,
      player: filters.value.player,
      from: transferPeriodStart(filters.value.period, new Date()),
      limit: TRANSFERS_PER_PAGE,
      offset: offset.value,
    }),
  { default: () => ({ transfers: [], total: 0 }) },
);

const transfers = computed(() => data.value?.transfers ?? []);
const totalTransfers = computed(() => data.value?.total ?? 0);
const isFiltered = computed(() =>
  Boolean(type.value || team.value || player.value || period.value !== "all"),
);

const currentPage = computed(() => Math.floor(offset.value / TRANSFERS_PER_PAGE) + 1);
const totalPages = computed(() => Math.ceil(totalTransfers.value / TRANSFERS_PER_PAGE));
const hasPrevious = computed(() => offset.value > 0);
const hasNext = computed(() => offset.value + TRANSFERS_PER_PAGE < totalTransfers.value);

function buildQuery(
  next: Partial<Record<"type" | "period" | "team" | "player", string | null | undefined>>,
  nextOffset = 0,
): LocationQueryRaw {
  const merged = { ...filters.value, ...next };
  const query: LocationQueryRaw = {};
  if (merged.type) query.type = merged.type;
  if (merged.period && merged.period !== "all") query.period = merged.period;
  if (merged.team) query.team = merged.team;
  if (merged.player) query.player = merged.player;
  if (nextOffset > 0) query.offset = String(nextOffset);
  return query;
}

function applyFilter(
  next: Partial<Record<"type" | "period" | "team" | "player", string | null | undefined>>,
) {
  router.replace({ path: localePath("/transfers"), query: buildQuery(next) });
}

const typeLinks = computed(() => [
  { value: undefined, label: t("common.all") },
  ...TRANSFER_TYPES.map((value) => ({ value, label: t(`page.transfers.filters.types.${value}`) })),
]);

const periodItems = computed(() =>
  TRANSFER_PERIODS.map((value) => ({ value, label: t(`page.transfers.filters.periods.${value}`) })),
);

const periodModel = computed({
  get: () => period.value,
  set: (value: string) => applyFilter({ period: value }),
});
const teamModel = computed({
  get: () => team.value ?? null,
  set: (value: string | null) => applyFilter({ team: value }),
});
const playerModel = computed({
  get: () => player.value ?? null,
  set: (value: string | null) => applyFilter({ player: value }),
});

setPageSeo({
  title: t("page.transfers.seo.title"),
  description: t("page.transfers.seo.description"),
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>{{ t("page.transfers.title") }}</template>
      <template v-if="totalTransfers > 0" #meta>
        <span>{{ t("page.hub.headers.transfersTotal", { count: totalTransfers }) }}</span>
      </template>
    </SHubPageHeader>

    <div>
      <SCard class="flex h-row items-center overflow-x-auto">
        <nav
          class="flex w-full min-w-max items-center gap-px px-1.5"
          :aria-label="t('page.transfers.filters.type')"
        >
          <UButton
            v-for="link in typeLinks"
            :key="link.value ?? 'all'"
            color="neutral"
            variant="ghost"
            size="xs"
            :to="{ path: $localePath('/transfers'), query: buildQuery({ type: link.value }) }"
            :aria-current="type === link.value ? 'page' : undefined"
            class="h-7 shrink-0 justify-center px-2 pointer-coarse:h-10 selectable"
          >
            {{ link.label }}
          </UButton>
        </nav>
      </SCard>

      <SCard
        flush-top
        class="grid min-h-row h-row-grid grid-cols-1 items-center gap-2 p-1.5 sm:grid-cols-3"
      >
        <USelect
          v-model="periodModel"
          :items="periodItems"
          value-key="value"
          :aria-label="t('page.transfers.filters.period')"
          color="neutral"
          variant="outline"
          size="sm"
          class="w-full"
        />
        <TransferFilterSelect
          v-model="teamModel"
          kind="team"
          :label="t('page.transfers.filters.team')"
          :placeholder="t('page.transfers.filters.anyTeam')"
        />
        <TransferFilterSelect
          v-model="playerModel"
          kind="player"
          :label="t('page.transfers.filters.player')"
          :placeholder="t('page.transfers.filters.anyPlayer')"
        />
      </SCard>

      <SCard v-if="pending" flush-bottom flush-top aria-live="polite">
        <span class="sr-only">{{ t("common.loading") }}</span>
        <SListItem v-for="index in 8" :key="index" divider class="gap-3">
          <USkeleton class="h-3 w-20 shrink-0" />
          <USkeleton class="size-7 shrink-0" />
          <USkeleton class="h-3 max-w-40 flex-1" />
          <USkeleton class="h-3 w-20" />
          <USkeleton class="h-3 w-28" />
        </SListItem>
      </SCard>

      <SCard v-else-if="error" flush-top class="flex min-h-row-stack h-row-grid items-center">
        <SErrorState :message="t('page.transfers.error')" @retry="refresh()" />
      </SCard>

      <SCard v-else-if="transfers.length > 0" flush-bottom flush-top>
        <TransferRow v-for="transfer in transfers" :key="transfer.id" :transfer="transfer" />
      </SCard>

      <SCard v-else flush-top class="flex min-h-row-stack h-row-grid items-center">
        <SEmptyState
          icon="i-fluent-people-swap-24-regular"
          :title="t('components.transfer.empty.title')"
          :hint="
            isFiltered ? t('page.transfers.emptyFiltered') : t('components.transfer.empty.hint')
          "
        >
          <UButton
            v-if="isFiltered"
            color="neutral"
            variant="outline"
            :to="$localePath('/transfers')"
          >
            {{ t("page.transfers.clearFilters") }}
          </UButton>
        </SEmptyState>
      </SCard>

      <SPagination
        v-if="totalPages > 1"
        :current-page="currentPage"
        :total-pages="totalPages"
        :has-previous="hasPrevious"
        :has-next="hasNext"
        :previous-to="{
          path: $localePath('/transfers'),
          query: buildQuery({}, Math.max(0, offset - TRANSFERS_PER_PAGE)),
        }"
        :next-to="{
          path: $localePath('/transfers'),
          query: buildQuery({}, offset + TRANSFERS_PER_PAGE),
        }"
        class="mt-row"
      />
    </div>
  </div>
</template>
