<script lang="ts" setup>
import {
  PLAYER_AWARD_TYPES,
  type PlayerAwardType as AwardType,
  type TournamentAwardListItem,
} from "@sarpbc/types";

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
const selectedAwardType = ref<AwardType | null>(null);

const { data: awards, refresh: refreshAwards } = await useLazyAsyncData(
  () => `admin-tournament-${props.tournamentId}-awards`,
  () => getTournamentAwards(props.tournamentId),
  { server: false, watch: [() => props.tournamentId] },
);

const assignedTypes = computed(() => new Set((awards.value ?? []).map((award) => award.awardType)));

const availableAwardTypeOptions = computed(() =>
  PLAYER_AWARD_TYPES.filter((type) => !assignedTypes.value.has(type)).map((type) => ({
    value: type,
    label: t(`page.tournaments.awards.types.${type}`),
  })),
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

watch(
  availableAwardTypeOptions,
  (options) => {
    if (options.length === 0) {
      selectedAwardType.value = null;
      return;
    }
    if (
      !selectedAwardType.value ||
      !options.some((option) => option.value === selectedAwardType.value)
    ) {
      selectedAwardType.value = options[0]?.value ?? null;
    }
  },
  { immediate: true },
);

async function handleAssignAward() {
  const entry = selectedEntry.value;
  const awardType = selectedAwardType.value;
  if (!entry || !awardType) {
    return;
  }

  assigning.value = true;
  try {
    const award = await createTournamentAward(props.tournamentId, {
      participantId: entry.participantId,
      playerId: entry.playerId,
      awardType,
    });
    if (award) {
      toast.add({
        title: t("page.tournaments.awards.assigned", {
          name: entry.playerName,
          type: t(`page.tournaments.awards.types.${awardType}`),
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
      <p class="text-sm text-muted">{{ $t("page.tournaments.awards.hint") }}</p>
    </div>

    <div
      v-for="award in awards ?? []"
      :key="award.id"
      class="flex flex-row items-center justify-between gap-4 border border-default p-3"
    >
      <div class="min-w-0">
        <p class="font-medium">
          {{ $t(`page.tournaments.awards.types.${award.awardType}`) }}:
          {{ award.player.name }}
        </p>
        <p v-if="award.participant.team?.name" class="text-sm text-muted">
          {{ award.participant.team.name }}
        </p>
      </div>
      <UButton
        size="sm"
        color="error"
        variant="soft"
        :loading="removingAwardId === award.id"
        :label="$t('page.tournaments.awards.remove')"
        @click="handleRemoveAward(award)"
      />
    </div>

    <div
      v-if="availableAwardTypeOptions.length > 0 && rosterOptions.length > 0"
      class="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <UFormField :label="$t('page.tournaments.awards.awardType')" class="min-w-0 sm:w-48">
        <USelect
          v-model="selectedAwardType"
          :items="availableAwardTypeOptions"
          value-key="value"
          label-key="label"
        />
      </UFormField>
      <UFormField :label="$t('page.tournaments.awards.selectPlayer')" class="min-w-0 flex-1">
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
        :disabled="!selectedPlayerId || !selectedAwardType"
        :label="$t('page.tournaments.awards.assignAction')"
        @click="handleAssignAward"
      />
    </div>

    <p v-else-if="rosterOptions.length === 0" class="text-sm text-muted">
      {{ $t("page.tournaments.awards.noRoster") }}
    </p>

    <p v-else-if="availableAwardTypeOptions.length === 0" class="text-sm text-muted">
      {{ $t("page.tournaments.awards.allAssigned") }}
    </p>
  </section>
</template>
