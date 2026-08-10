<script lang="ts" setup>
import { DateFormatter } from "@internationalized/date";
import type { ContractRole, PlayerContract } from "~/types/contract";

const { contracts } = defineProps<{
  contracts: PlayerContract[];
}>();

const { t, locale } = useI18n();

const headingId = "player-former-teams-title";

const df = computed(() => new DateFormatter(locale.value, { dateStyle: "medium" }));

const formatContractDate = (dateStr: string | null) =>
  dateStr ? df.value.format(new Date(dateStr)) : t("page.player.slug.contractDateUnknown");

const roleLabel = (role: ContractRole) => t(`common.contractRole.${role}`);
</script>

<template>
  <section :aria-labelledby="headingId">
    <UiRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t("page.player.slug.formerTeams") }}
        </h2>
      </template>
      <div class="flex flex-col border border-default divide-y divide-default">
        <div
          v-for="contract in contracts"
          :key="contract.id"
          class="flex flex-row items-center gap-3 p-3"
        >
          <TeamImg
            :team-name="contract.team.name"
            :image-url="contract.team.imageUrl ?? undefined"
            size="sm"
          />
          <div class="flex-1 min-w-0">
            <UiLink :to="$localePath(`/team/${contract.team.slug}`)" variant="inline">
              {{ contract.team.name }}
            </UiLink>
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
    </UiRail>
  </section>
</template>
