<script lang="ts" setup>
const LATEST_TRANSFERS = 5;

const { team } = defineProps<{
  /** Team slug; a team page hides the block while its roster has no recorded movement. */
  team?: string;
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const { transfers, pending, error, refresh } = useLatestTransfers(
  toRef(() => team),
  LATEST_TRANSFERS,
);

const headingId = computed(() => (team ? "team-transfers-title" : "latest-transfers-title"));
const visible = computed(
  () => !team || pending.value || Boolean(error.value) || transfers.value.length > 0,
);
const allTransfersPath = computed(() => ({
  path: localePath("/transfers"),
  query: team ? { team } : {},
}));
</script>

<template>
  <section v-if="visible" :aria-labelledby="headingId">
    <SRail>
      <template #caption>
        <div class="flex w-full items-end justify-between gap-2 pr-2">
          <h2 :id="headingId">{{ t("components.transfer.latest.title") }}</h2>
          <SLink :to="allTransfersPath" class="text-xs">
            {{ t("components.transfer.latest.viewAll") }}
          </SLink>
        </div>
      </template>

      <SCard v-if="pending" flush-bottom flush-top aria-live="polite">
        <span class="sr-only">{{ t("common.loading") }}</span>
        <SListItem v-for="index in LATEST_TRANSFERS" :key="index" divider class="gap-3">
          <USkeleton class="h-3 w-20 shrink-0" />
          <USkeleton class="size-7 shrink-0" />
          <USkeleton class="h-3 max-w-40 flex-1" />
          <USkeleton class="h-3 w-20" />
        </SListItem>
      </SCard>

      <SCard v-else-if="error" flush-top class="flex min-h-row-stack h-row-grid items-center">
        <SErrorState :message="t('components.transfer.latest.error')" @retry="refresh()" />
      </SCard>

      <SCard v-else-if="transfers.length > 0" flush-bottom flush-top>
        <TransferRow
          v-for="transfer in transfers"
          :key="transfer.id"
          :transfer="transfer"
          :show-team="!team"
        />
      </SCard>

      <SCard v-else flush-top class="flex min-h-row-stack h-row-grid items-center">
        <SEmptyState
          icon="i-fluent-people-swap-24-regular"
          :title="t('components.transfer.empty.title')"
          :hint="t('components.transfer.empty.hint')"
        />
      </SCard>
    </SRail>
  </section>
</template>
