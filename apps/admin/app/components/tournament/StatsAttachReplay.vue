<script lang="ts" setup>
import type { StatsImportItem, TournamentMatchListItem, TournamentStatsGame } from "@sarpbc/types";
import { getApiErrorMessage, maxVodGame, participantName } from "@sarpbc/utils";

const target = defineModel<StatsImportItem | null>("target", { required: true });

const props = defineProps<{
  tournamentId: string;
  matches: TournamentMatchListItem[];
  games: TournamentStatsGame[];
  matchLabel: (match: TournamentMatchListItem) => string;
}>();

const emit = defineEmits<{ attached: [game: TournamentStatsGame] }>();

const { t } = useI18n();
const toast = useToast();

const matchId = ref<string | undefined>();
const gameNumber = ref<number | undefined>();
const blueParticipantId = ref<string | undefined>();
const saving = ref(false);
const shown = shallowRef<StatsImportItem | null>(null);

const open = computed({
  get: () => target.value !== null,
  set: (value) => {
    if (!value && !saving.value) target.value = null;
  },
});

const pickable = computed(() =>
  props.matches.filter((match) => (match.participants?.length ?? 0) === 2),
);
const match = computed(() => pickable.value.find((candidate) => candidate.id === matchId.value));

const matchOptions = computed(() =>
  pickable.value.map((candidate) => ({ value: candidate.id, label: props.matchLabel(candidate) })),
);

const gameOptions = computed(() => {
  const taken = new Set(
    props.games.filter((game) => game.matchId === matchId.value).map((game) => game.number),
  );
  return Array.from({ length: maxVodGame(match.value?.numberOfGames) }, (_, index) => ({
    value: index + 1,
    label: taken.has(index + 1)
      ? t("page.tournaments.statsAttach.gameTaken", { number: index + 1 })
      : t("page.tournaments.statsAttach.gameOption", { number: index + 1 }),
    disabled: taken.has(index + 1),
  }));
});

const sideOptions = computed(() =>
  (match.value?.participants ?? []).map((participant) => ({
    value: participant.id,
    label: participantName(participant),
  })),
);

watch(target, (item) => {
  if (item === null) return;
  shown.value = item;
  const known = pickable.value.some((candidate) => candidate.id === item.matchId);
  const blue =
    item.status === "unmatched" || item.status === "failed" ? item.blueParticipantId : null;
  matchId.value = known ? (item.matchId ?? undefined) : undefined;
  blueParticipantId.value = known ? (blue ?? undefined) : undefined;
  gameNumber.value = known && item.status === "failed" ? item.gameNumber : undefined;
});

watch(matchId, () => {
  if (!match.value?.participants.some((participant) => participant.id === blueParticipantId.value))
    blueParticipantId.value = undefined;
  if (gameOptions.value.find((option) => option.value === gameNumber.value)?.disabled !== false)
    gameNumber.value = undefined;
});

const canSave = computed(
  () => !!matchId.value && !!gameNumber.value && !!blueParticipantId.value && !saving.value,
);

async function save() {
  const item = target.value;
  if (!item || !matchId.value || !gameNumber.value || !blueParticipantId.value) return;
  saving.value = true;
  try {
    const game = await attachStatsReplay(props.tournamentId, {
      matchId: matchId.value,
      replay: item.replayId,
      gameNumber: gameNumber.value,
      blueParticipantId: blueParticipantId.value,
    });
    toast.add({
      title: t("page.tournaments.statsAttach.saved", { number: game.number }),
      color: "success",
    });
    emit("attached", game);
    target.value = null;
  } catch (error) {
    toast.add({
      title: t("page.tournaments.statsAttach.saveError"),
      description: getApiErrorMessage(error) ?? undefined,
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('page.tournaments.statsAttach.title')"
    :description="t('page.tournaments.statsAttach.description', { title: shown?.title ?? '' })"
    :dismissible="!saving"
  >
    <template #body>
      <form id="stats-attach-replay" class="flex flex-col gap-4" @submit.prevent="save">
        <UFormField :label="t('page.tournaments.statsAttach.match')" required>
          <USelectMenu
            v-model="matchId"
            :items="matchOptions"
            value-key="value"
            label-key="label"
            class="w-full"
            :placeholder="t('page.tournaments.statsAttach.matchPlaceholder')"
            :search-input="{ placeholder: t('page.tournaments.statsAttach.matchSearch') }"
          />
        </UFormField>

        <UFormField
          :label="t('page.tournaments.statsAttach.game')"
          :help="matchId ? undefined : t('page.tournaments.statsAttach.chooseMatchFirst')"
          required
        >
          <USelect
            v-model="gameNumber"
            :items="gameOptions"
            value-key="value"
            label-key="label"
            class="w-full"
            :disabled="!matchId"
            :placeholder="t('page.tournaments.statsAttach.gamePlaceholder')"
          />
        </UFormField>

        <UFormField
          :label="t('page.tournaments.statsAttach.blue')"
          :help="t('page.tournaments.statsAttach.blueHelp')"
          required
        >
          <URadioGroup
            v-if="matchId"
            v-model="blueParticipantId"
            :items="sideOptions"
            value-key="value"
            label-key="label"
          />
          <p v-else class="text-sm text-muted">
            {{ t("page.tournaments.statsAttach.chooseMatchFirst") }}
          </p>
        </UFormField>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full flex-row justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="$t('common.cancel')"
          :disabled="saving"
          @click="open = false"
        />
        <UButton
          type="submit"
          form="stats-attach-replay"
          icon="i-fluent-link-24-regular"
          :label="t('page.tournaments.statsAttach.submit')"
          :loading="saving"
          :disabled="!canSave"
        />
      </div>
    </template>
  </UModal>
</template>
