<script lang="ts" setup>
import { DateFormatter } from "@internationalized/date";
import type { Transfer, TransferType } from "~/types/transfer";

const { transfer, showTeam = true } = defineProps<{
  transfer: Transfer;
  showTeam?: boolean;
}>();

const { t, locale } = useI18n();

const dateDf = computed(
  () => new DateFormatter(locale.value, { dateStyle: "medium", timeZone: "UTC" }),
);

function typeIcon(type: TransferType): string {
  switch (type) {
    case "arrival":
      return "i-fluent-arrow-down-24-regular";
    case "departure":
      return "i-fluent-arrow-up-24-regular";
    case "benched":
      return "i-fluent-pause-24-regular";
    case "loan":
      return "i-fluent-arrow-swap-24-regular";
    case "staff":
      return "i-fluent-briefcase-24-regular";
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

const typeLabel = computed(() =>
  transfer.type === "staff"
    ? t(`common.contractRole.${transfer.role}`)
    : t(`components.transfer.type.${transfer.type}`),
);
</script>

<template>
  <SListItem divider class="min-w-0 gap-3">
    <time
      :datetime="transfer.date"
      class="w-20 shrink-0 truncate text-xs text-muted tabular-nums sm:w-24"
    >
      {{ dateDf.format(new Date(transfer.date)) }}
    </time>
    <SLink
      :to="$localePath(`/player/${transfer.player.slug}`)"
      variant="inline"
      class="flex min-w-0 flex-1 items-center gap-2"
    >
      <PlayerImg
        :player-name="transfer.player.name"
        :img="transfer.player.imageUrl || undefined"
        size="list"
      />
      <span class="truncate text-sm font-medium">{{ transfer.player.name }}</span>
      <FlagIcon
        v-if="transfer.player.nationality"
        :nationality="transfer.player.nationality"
        size="md"
        class="shrink-0"
      />
    </SLink>
    <span class="flex shrink-0 items-center gap-1.5 text-xs text-muted sm:w-28">
      <UIcon :name="typeIcon(transfer.type)" class="size-4 shrink-0" aria-hidden="true" />
      <span class="sr-only truncate sm:not-sr-only">
        {{ typeLabel }}
      </span>
    </span>
    <SLink
      v-if="showTeam"
      :to="$localePath(`/team/${transfer.team.slug}`)"
      variant="inline"
      class="flex w-28 min-w-0 shrink-0 items-center gap-2 sm:w-40"
    >
      <TeamImg
        :team-name="transfer.team.name"
        :image-url="transfer.team.imageUrl || undefined"
        :dark-mode-image-url="transfer.team.darkModeImageUrl || undefined"
        size="xs"
      />
      <span class="truncate text-sm">{{ transfer.team.name }}</span>
    </SLink>
  </SListItem>
</template>
