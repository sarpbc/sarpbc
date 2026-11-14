<script lang="ts" setup>
import { teamPath } from "@sarpbc/utils";
import type { PlayerContract } from "@sarpbc/types";

const { contracts } = defineProps<{
  contracts: PlayerContract[];
}>();

const { t, locale } = useI18n();

const headingId = useId();

const mediumDate = computed(() => mediumDateFormatter(locale.value));

const formatRange = (contract: PlayerContract): string => {
  const start = mediumDate.value.format(new Date(contract.startDate));

  const end = contract.endDate
    ? mediumDate.value.format(new Date(contract.endDate))
    : t("page.staff.slug.timeline.present");

  return `${start} – ${end}`;
};
</script>

<template>
  <section :aria-labelledby="headingId">
    <SRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t("page.staff.slug.timeline.title") }}
        </h2>
      </template>
      <ol
        class="m-0 flex list-none flex-col divide-y divide-separator border-x border-b border-separator p-0"
      >
        <li v-for="contract in contracts" :key="contract.id" class="flex items-center gap-3 p-3">
          <TeamImg :team-name="contract.team.name" :logo="contract.team" size="sm" />
          <div class="flex min-w-0 flex-1 flex-col">
            <SLink
              :to="$localePath(teamPath(contract.team.slug))"
              variant="inline"
              class="truncate"
            >
              {{ contract.team.name }}
            </SLink>
            <span class="text-sm text-muted">
              {{ t(`common.contractRole.${contract.role}`) }}
              <span class="mx-1" aria-hidden="true">·</span>
              <time :datetime="contract.startDate">{{ formatRange(contract) }}</time>
            </span>
          </div>
          <UBadge v-if="!contract.endDate" color="primary" variant="subtle" size="sm">
            {{ t("page.staff.slug.timeline.current") }}
          </UBadge>
        </li>
      </ol>
    </SRail>
  </section>
</template>
