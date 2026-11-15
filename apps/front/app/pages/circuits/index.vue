<script lang="ts" setup>
import { circuitPath } from "@sarpbc/utils";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const {
  data: circuits,
  pending,
  error,
  refresh,
} = await useAsyncData("circuits-index", () => getCircuits(), { default: () => [] });

setPageSeo({
  description: t("page.circuits.index.description"),
  title: t("page.circuits.index.seoTitle"),
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <HubPageHeader>
      <template #title>{{ t("page.circuits.index.title") }}</template>
    </HubPageHeader>

    <div>
      <HubCard v-if="pending && !circuits.length" aria-live="polite">
        <span class="sr-only">{{ t("common.loading") }}</span>
        <HubListItem v-for="index in 3" :key="index">
          <div class="flex w-full min-w-0 flex-col gap-2">
            <SbSkeleton class="h-3 w-40" />
            <SbSkeleton class="h-3 w-64 max-w-full" />
          </div>
        </HubListItem>
      </HubCard>

      <HubCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
        <SbErrorState :message="t('page.circuits.index.error')" @retry="refresh()" />
      </HubCard>

      <HubCard v-else-if="circuits.length">
        <ul>
          <li v-for="circuit in circuits" :key="circuit.id">
            <HubListItem :to="$localePath(circuitPath(circuit.slug))" class="min-w-0">
              <div class="flex w-full min-w-0 flex-col">
                <span class="truncate text-sm font-medium text-highlighted">
                  {{ circuit.name }}
                </span>
                <span v-if="circuit.description" class="truncate text-xs text-muted">
                  {{ circuit.description }}
                </span>
              </div>
            </HubListItem>
          </li>
        </ul>
      </HubCard>

      <HubCard v-else class="flex min-h-row-stack h-row-grid items-center">
        <SbEmptyState
          icon="i-fluent-trophy-24-regular"
          :title="t('page.circuits.index.empty')"
          :hint="t('page.circuits.index.emptyHint')"
        />
      </HubCard>
    </div>
  </div>
</template>
