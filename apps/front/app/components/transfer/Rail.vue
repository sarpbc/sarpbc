<script lang="ts" setup>
import type { Transfer } from "@sarpbc/types";
import { playerPath } from "@sarpbc/utils";

const RAIL_TRANSFERS = 5;

const { t } = useI18n();
const localePath = useLocalePath();

const { transfers, pending, error, refresh } = useLatestTransfers(undefined, RAIL_TRANSFERS);

function isTeamMove(transfer: Transfer): boolean {
  return transfer.type === "arrival" || transfer.type === "departure";
}

function transferLabel(transfer: Transfer): string {
  const type =
    transfer.type === "staff"
      ? t(`common.contractRole.${transfer.role}`)
      : t(`components.transfer.type.${transfer.type}`);
  return `${transfer.player.name} · ${type} · ${transfer.team.name}`;
}
</script>

<template>
  <section
    v-if="pending || error || transfers.length > 0"
    aria-labelledby="rail-transfers-title"
    class="w-full"
  >
    <SRail>
      <template #caption>
        <h2 id="rail-transfers-title">{{ t("components.transfer.latest.title") }}</h2>
      </template>

      <SCard v-if="pending" aria-live="polite">
        <span class="sr-only">{{ t("common.loading") }}</span>
        <SListItem v-for="index in RAIL_TRANSFERS" :key="index" class="gap-2">
          <USkeleton class="size-7 shrink-0" />
          <USkeleton class="ms-auto size-4" />
          <USkeleton class="size-4" />
          <USkeleton class="size-4" />
        </SListItem>
      </SCard>

      <SCard v-else-if="error" class="p-2">
        <SErrorState :message="t('components.transfer.latest.error')" @retry="refresh()" />
      </SCard>

      <SCard v-else>
        <SListItem
          v-for="transfer in transfers"
          :key="transfer.id"
          :to="localePath(playerPath(transfer.player.slug))"
          :title="transferLabel(transfer)"
          :aria-label="transferLabel(transfer)"
          class="gap-2 text-muted"
        >
          <PlayerImg
            :player-name="transfer.player.name"
            :img="transfer.player.imageUrl || undefined"
            size="list"
          />
          <span
            class="ms-auto flex items-center gap-2"
            :class="{ 'flex-row-reverse': transfer.type === 'departure' }"
          >
            <UIcon
              v-if="isTeamMove(transfer)"
              name="i-fluent-person-tentative-24-regular"
              class="size-4 shrink-0"
              aria-hidden="true"
            />
            <UIcon
              :name="
                isTeamMove(transfer)
                  ? 'i-fluent-arrow-right-24-regular'
                  : transferTypeIcon(transfer.type)
              "
              class="size-4 shrink-0"
              aria-hidden="true"
            />
            <TeamImg :team-name="transfer.team.name" :logo="transfer.team" size="xs" />
          </span>
        </SListItem>
      </SCard>
    </SRail>
  </section>
</template>
