<script lang="ts" setup>
import type { TournamentMatchListItem, TournamentStatsGame } from "@sarpbc/types";
import { getApiErrorMessage, participantName } from "@sarpbc/utils";

const target = defineModel<TournamentStatsGame | null>("target", { required: true });

const { matches, matchLabel, tournamentId } = defineProps<{
  tournamentId: string;
  matches: TournamentMatchListItem[];
  matchLabel: (match: TournamentMatchListItem) => string;
}>();

const emit = defineEmits<{ added: [] }>();

const { t } = useI18n();
const toast = useToast();

const replay = ref("");
const blueParticipantId = ref<string | undefined>();
const saving = ref(false);
const shown = shallowRef<TournamentStatsGame | null>(null);

const open = computed({
  get: () => target.value !== null,
  set: (value) => {
    if (!value && !saving.value) {
      target.value = null;
    }
  },
});

const match = computed(() => matches.find((candidate) => candidate.id === shown.value?.matchId));

const sideOptions = computed(() =>
  (match.value?.participants ?? []).map((participant) => ({
    label: participantName(participant),
    value: participant.id,
  })),
);

watch(target, (game) => {
  if (game === null) {
    return;
  }

  shown.value = game;
  replay.value = "";
  blueParticipantId.value = game.blueParticipantId;
});

const canSave = computed(
  () => replay.value.trim() !== "" && blueParticipantId.value !== undefined && !saving.value,
);

const save = async () => {
  const game = target.value;

  if (!game || replay.value.trim() === "" || blueParticipantId.value === undefined) {
    return;
  }

  saving.value = true;

  try {
    await appendStatsReplay(tournamentId, game.matchId, game.number, {
      blueParticipantId: blueParticipantId.value,
      replay: replay.value.trim(),
    });

    toast.add({
      color: "success",
      title: t("page.tournaments.statsAttach.appended", { number: game.number }),
    });
    emit("added");
    target.value = null;
  } catch (error) {
    toast.add({
      color: "danger",
      description: getApiErrorMessage(error) ?? undefined,
      title: t("page.tournaments.statsAttach.saveError"),
    });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <SModal
    v-model:open="open"
    :title="t('page.tournaments.statsAddReplay.title', { number: shown?.number ?? '' })"
    :description="
      t('page.tournaments.statsAddReplay.description', {
        match: match ? matchLabel(match) : '',
      })
    "
    :dismissible="!saving"
  >
    <template #body>
      <form id="stats-add-replay" class="flex flex-col gap-4" @submit.prevent="save">
        <SFormField :label="t('page.tournaments.statsAddReplay.replay')" required>
          <SInput
            v-model="replay"
            class="w-full"
            autocomplete="off"
            spellcheck="false"
            :placeholder="t('page.tournaments.statsAddReplay.replayPlaceholder')"
          />
        </SFormField>

        <SFormField
          :label="t('page.tournaments.statsAttach.blue')"
          :help="t('page.tournaments.statsAttach.blueHelp')"
          required
        >
          <SRadioGroup v-model="blueParticipantId" :items="sideOptions" />
        </SFormField>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full flex-row justify-end gap-2">
        <SButton
          variant="tertiary"
          :label="$t('common.cancel')"
          :disabled="saving"
          @click="open = false"
        />
        <SButton
          type="submit"
          form="stats-add-replay"
          icon="i-fluent-add-24-regular"
          :label="t('page.tournaments.statsAddReplay.submit')"
          :loading="saving"
          :disabled="!canSave"
        />
      </div>
    </template>
  </SModal>
</template>
