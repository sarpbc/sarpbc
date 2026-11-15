<script lang="ts" setup>
const LATEST_TRANSFERS = 5;

const { team = null } = defineProps<{
  team?: string | null;
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const { transfers, pending, error, refresh } = useLatestTransfers(
  toRef(() => team ?? undefined),
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
    <HubRail>
      <template #caption>
        <div class="flex w-full items-end justify-between gap-2 pr-2">
          <h2 :id="headingId">{{ t("components.transfer.latest.title") }}</h2>
          <SbLink :to="allTransfersPath" class="text-xs">
            {{ t("components.transfer.latest.viewAll") }}
          </SbLink>
        </div>
      </template>

      <HubCard v-if="pending" aria-live="polite">
        <span class="sr-only">{{ t("common.loading") }}</span>
        <HubListItem v-for="index in LATEST_TRANSFERS" :key="index" class="gap-3">
          <SbSkeleton class="h-3 w-20 shrink-0" />
          <SbSkeleton class="size-7 shrink-0" />
          <SbSkeleton class="h-3 max-w-40 flex-1" />
          <SbSkeleton class="h-3 w-20" />
        </HubListItem>
      </HubCard>

      <HubCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
        <SbErrorState :message="t('components.transfer.latest.error')" @retry="refresh()" />
      </HubCard>

      <HubCard v-else-if="transfers.length > 0">
        <TransferRow
          v-for="transfer in transfers"
          :key="transfer.id"
          :transfer="transfer"
          :show-team="!team"
        />
      </HubCard>

      <HubCard v-else class="flex min-h-row-stack h-row-grid items-center">
        <SbEmptyState
          icon="i-fluent-people-swap-24-regular"
          :title="t('components.transfer.empty.title')"
          :hint="t('components.transfer.empty.hint')"
        />
      </HubCard>
    </HubRail>
  </section>
</template>
