<script lang="ts" setup>
import {
  PLAYER_AWARD_TYPES,
  type PlayerAwardType,
  type TournamentAwardListItem,
} from "@sarpbc/types";
import { getApiErrorMessage } from "@sarpbc/utils";

const { tournamentId, participants } = defineProps<{
  tournamentId: string;
  participants: {
    id: string;
    team: { name: string } | null;
    players?: { id: string; name: string }[];
  }[];
}>();

const { t } = useI18n();
const toast = useToast();
const reportError = useReportError();

const assigning = ref(false);
const removingAwardId = ref<string | null>(null);
const selectedPlayerId = ref<string>();
const selectedAwardType = ref<PlayerAwardType>();

const {
  data: awards,
  error,
  refresh: refreshAwards,
} = useLazyAsyncData(
  () => `admin-tournament-${tournamentId}-awards`,
  () => getTournamentAwards(tournamentId),
  { server: false, watch: [() => tournamentId] },
);

const assignedTypes = computed(() => new Set((awards.value ?? []).map((award) => award.awardType)));

const availableAwardTypeOptions = computed(() =>
  PLAYER_AWARD_TYPES.filter((type) => !assignedTypes.value.has(type)).map((type) => ({
    value: type,
    label: t(`page.tournaments.awards.types.${type}`),
  })),
);

const rosterOptions = computed(() => {
  const options: {
    value: string;
    label: string;
    participantId: string;
    playerId: string;
    playerName: string;
  }[] = [];

  for (const participant of participants) {
    for (const player of participant.players ?? []) {
      options.push({
        value: player.id,
        label: participant.team ? `${player.name} (${participant.team.name})` : player.name,
        participantId: participant.id,
        playerId: player.id,
        playerName: player.name,
      });
    }
  }

  return options.toSorted((a, b) => a.label.localeCompare(b.label));
});

const selectedEntry = computed(() =>
  rosterOptions.value.find((option) => option.value === selectedPlayerId.value),
);

watch(
  availableAwardTypeOptions,
  (options) => {
    if (options.length === 0) {
      selectedAwardType.value = undefined;

      return;
    }

    if (
      !selectedAwardType.value ||
      !options.some((option) => option.value === selectedAwardType.value)
    ) {
      selectedAwardType.value = options[0]?.value;
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
    await createTournamentAward(tournamentId, {
      participantId: entry.participantId,
      playerId: entry.playerId,
      awardType,
    });
    toast.add({
      title: t("page.tournaments.awards.assigned", {
        name: entry.playerName,
        type: t(`page.tournaments.awards.types.${awardType}`),
      }),
      color: "success",
    });
    selectedPlayerId.value = undefined;
    await refreshAwards();
  } catch (assignError) {
    reportError(assignError);
  } finally {
    assigning.value = false;
  }
}

async function handleRemoveAward(award: TournamentAwardListItem) {
  removingAwardId.value = award.id;

  try {
    await deleteTournamentAward(tournamentId, award.id);
    toast.add({
      title: t("page.tournaments.awards.removed", {
        type: t(`page.tournaments.awards.types.${award.awardType}`),
      }),
      color: "success",
    });
    await refreshAwards();
  } catch (removeError) {
    reportError(removeError);
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

    <LoadError
      v-if="error"
      :message="getApiErrorMessage(error) ?? $t('common.loadFailed')"
      @retry="refreshAwards()"
    />

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
