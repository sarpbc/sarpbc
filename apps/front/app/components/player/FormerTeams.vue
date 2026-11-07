<script lang="ts" setup>
import { teamPath } from "@sarpbc/utils";
import type { ContractRole, PlayerContract } from "@sarpbc/types";

const { contracts } = defineProps<{
  contracts: PlayerContract[];
}>();

const { t, locale } = useI18n();

const headingId = "player-former-teams-title";

const mediumDate = computed(() => mediumDateFormatter(locale.value));

const formatContractDate = (dateStr: string | null) =>
  dateStr ? mediumDate.value.format(new Date(dateStr)) : t("page.player.slug.contractDateUnknown");

const roleLabel = (role: ContractRole) => t(`common.contractRole.${role}`);
</script>

<template>
  <section :aria-labelledby="headingId">
    <SRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t("page.player.slug.formerTeams") }}
        </h2>
      </template>
      <div class="flex flex-col divide-y divide-default border-x border-b border-default">
        <div
          v-for="contract in contracts"
          :key="contract.id"
          class="flex flex-row items-center gap-3 p-3"
        >
          <TeamImg :team-name="contract.team.name" :logo="contract.team" size="sm" />
          <div class="flex-1 min-w-0">
            <SLink :to="$localePath(teamPath(contract.team.slug))" variant="inline">
              {{ contract.team.name }}
            </SLink>
            <div class="text-sm text-muted">
              <span>{{ roleLabel(contract.role) }}</span>
              <span class="mx-1" aria-hidden="true">·</span>
              <span>
                {{ formatContractDate(contract.startDate) }}
                {{ t("page.player.slug.contractTo") }}
                {{ formatContractDate(contract.endDate) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </SRail>
  </section>
</template>
