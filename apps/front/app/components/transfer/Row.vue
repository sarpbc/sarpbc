<script lang="ts" setup>
import { playerPath, teamPath } from "@sarpbc/utils";
import { DateFormatter } from "@internationalized/date";
import type { Transfer } from "@sarpbc/types";

const { transfer, showTeam = true } = defineProps<{
  transfer: Transfer;
  showTeam?: boolean;
}>();

const { t, locale } = useI18n();

const dateDf = computed(
  () => new DateFormatter(locale.value, { dateStyle: "medium", timeZone: "UTC" }),
);

const typeLabel = computed(() =>
  transfer.type === "staff"
    ? t(`common.contractRole.${transfer.role}`)
    : t(`components.transfer.type.${transfer.type}`),
);
</script>

<template>
  <HubListItem class="min-w-0 gap-3">
    <time
      :datetime="transfer.date"
      class="hidden w-24 shrink-0 truncate text-xs text-muted tabular-nums sm:block"
    >
      {{ dateDf.format(new Date(transfer.date)) }}
    </time>
    <SLink
      :to="$localePath(playerPath(transfer.player.slug))"
      class="flex min-w-0 flex-1 items-center gap-2"
    >
      <PlayerImg
        :player-name="transfer.player.name"
        :img="transfer.player.imageUrl || undefined"
        size="list"
      />
      <span class="flex min-w-0 flex-col">
        <span class="flex min-w-0 items-center gap-2">
          <span class="truncate text-sm font-medium">{{ transfer.player.name }}</span>
          <FlagIcon
            v-if="transfer.player.nationality"
            :nationality="transfer.player.nationality"
            size="md"
            class="shrink-0"
          />
        </span>
        <span class="truncate text-xs font-normal text-muted sm:hidden">
          {{ typeLabel }} ·
          <time :datetime="transfer.date" class="tabular-nums">
            {{ dateDf.format(new Date(transfer.date)) }}
          </time>
        </span>
      </span>
    </SLink>
    <span class="hidden w-28 shrink-0 items-center gap-1.5 text-xs text-muted sm:flex">
      <Icon :name="transferTypeIcon(transfer.type)" class="size-4 shrink-0" aria-hidden="true" />
      <span class="truncate">{{ typeLabel }}</span>
    </span>
    <SLink
      v-if="showTeam"
      :to="$localePath(teamPath(transfer.team.slug))"
      class="flex w-28 min-w-0 shrink-0 items-center gap-2 sm:w-40"
    >
      <TeamImg :team-name="transfer.team.name" :logo="transfer.team" size="xs" />
      <span class="truncate text-sm">{{ transfer.team.name }}</span>
    </SLink>
  </HubListItem>
</template>
