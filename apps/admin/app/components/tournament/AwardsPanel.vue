<script lang="ts" setup>
import { PlayerAwardType, type TournamentAwardListItem } from "@sarpbc/types";

const props = defineProps<{
  tournamentId: string;
  participants: Array<{
    id: string;
    team: { name: string };
    players?: Array<{ id: string; name: string }>;
  }>;
}>();

const { t } = useI18n();
const toast = useToast();

const assigning = ref(false);
const removingAwardId = ref<string | null>(null);
const selectedPlayerId = ref<string | null>(null);

const { data: awards, refresh: refreshAwards } = await useLazyAsyncData(
  () => `admin-tournament-${props.tournamentId}-awards`,
  () => getTournamentAwards(props.tournamentId),
  { server: false, watch: [() => props.tournamentId] },
);

const mvpAward = computed(() =>
  (awards.value ?? []).find((award) => award.awardType === PlayerAwardType.MVP),
);

const rosterOptions = computed(() => {
  const options: Array<{
    value: string;
    label: string;
    participantId: string;
    playerId: string;
    playerName: string;
  }> = [];

  for (const participant of props.participants) {
    for (const player of participant.players ?? []) {
      options.push({
        value: player.id,
        label: `${player.name} (${participant.team.name})`,
        participantId: participant.id,
        playerId: player.id,
        playerName: player.name,
      });
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
});

const selectedEntry = computed(() =>
  rosterOptions.value.find((option) => option.value === selectedPlayerId.value),
);

async function handleAssignMvp() {
  const entry = selectedEntry.value;
  if (!entry) {
    return;
  }

  assigning.value = true;
  try {
    const award = await createTournamentAward(props.tournamentId, {
      participantId: entry.participantId,
      playerId: entry.playerId,
      awardType: PlayerAwardType.MVP,
    });
    if (award) {
      toast.add({
        title: t("page.tournaments.awards.mvpAssigned", {
          name: entry.playerName,
        }),
        color: "success",
      });
      selectedPlayerId.value = null;
      await refreshAwards();
    }
  } finally {
    assigning.value = false;
  }
}

async function handleRemoveAward(award: TournamentAwardListItem) {
  removingAwardId.value = award.id;
  try {
    const success = await deleteTournamentAward(props.tournamentId, award.id);
    if (success) {
      toast.add({
        title: t("page.tournaments.awards.removed", {
          type: t(`page.tournaments.awards.types.${award.awardType}`),
        }),
        color: "success",
      });
      await refreshAwards();
    }
  } finally {
    removingAwardId.value = null;
  }
}

defineExpose({ refreshAwards });
</script>

<template>
  <section class="flex flex-col gap-3 border border-default p-4">
    <div class="flex flex-col gap-1">
      <h2 class="text-lg font-semibold">{{ $t("page.tournaments.awards.title") }}</h2>
      <p class="text-sm text-muted">{{ $t("page.tournaments.awards.mvpHint") }}</p>
    </div>

    <div
      v-if="mvpAward"
      class="flex flex-row items-center justify-between gap-4 border border-default p-3"
    >
      <div class="min-w-0">
        <p class="font-medium">
          {{ $t("page.tournaments.awards.types.mvp") }}:
          {{ mvpAward.player.name }}
        </p>
        <p v-if="mvpAward.participant.team?.name" class="text-sm text-muted">
          {{ mvpAward.participant.team.name }}
        </p>
      </div>
      <UButton
        size="sm"
        color="error"
        variant="soft"
        :loading="removingAwardId === mvpAward.id"
        :label="$t('page.tournaments.awards.remove')"
        @click="handleRemoveAward(mvpAward)"
      />
    </div>

    <div v-else-if="rosterOptions.length > 0" class="flex flex-col gap-2 sm:flex-row sm:items-end">
      <UFormField :label="$t('page.tournaments.awards.assignMvp')" class="min-w-0 flex-1">
        <USelect
          v-model="selectedPlayerId"
          :items="rosterOptions"
          value-key="value"
          label-key="label"
          :placeholder="$t('page.tournaments.awards.selectPlayer')"
        />
      </UFormField>
      <UButton
        :loading="assigning"
        :disabled="!selectedPlayerId"
        :label="$t('page.tournaments.awards.assignAction')"
        @click="handleAssignMvp"
      />
    </div>

    <p v-else class="text-sm text-muted">
      {{ $t("page.tournaments.awards.noRoster") }}
    </p>
  </section>
</template>
