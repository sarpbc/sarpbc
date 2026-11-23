<script lang="ts" setup>
import type { StatsImportItem, TournamentMatchListItem, TournamentStatsGame } from "@sarpbc/types";
import { getApiErrorMessage, maxVodGame, participantName } from "@sarpbc/utils";

const target = defineModel<StatsImportItem | null>("target", { required: true });

const { matches, matchLabel, games, tournamentId } = defineProps<{
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
    if (!value && !saving.value) {
      target.value = null;
    }
  },
});

const pickable = computed(() => matches.filter((match) => (match.participants?.length ?? 0) === 2));

const match = computed(() => pickable.value.find((candidate) => candidate.id === matchId.value));

const matchOptions = computed(() =>
  pickable.value.map((candidate) => ({ label: matchLabel(candidate), value: candidate.id })),
);

const taken = computed(
  () => new Set(games.filter((game) => game.matchId === matchId.value).map((game) => game.number)),
);

const gameOptions = computed(() =>
  Array.from({ length: maxVodGame(match.value?.numberOfGames) }, (_, index) => ({
    label: taken.value.has(index + 1)
      ? t("page.tournaments.statsAttach.gameTaken", { number: index + 1 })
      : t("page.tournaments.statsAttach.gameOption", { number: index + 1 }),
    value: index + 1,
  })),
);

const appending = computed(
  () => gameNumber.value !== undefined && taken.value.has(gameNumber.value),
);

const gameHelp = computed(() => {
  if (!matchId.value) {
    return t("page.tournaments.statsAttach.chooseMatchFirst");
  }

  return appending.value
    ? t("page.tournaments.statsAttach.appendHelp", { number: gameNumber.value })
    : undefined;
});

const sideOptions = computed(() =>
  (match.value?.participants ?? []).map((participant) => ({
    label: participantName(participant),
    value: participant.id,
  })),
);

watch(target, (item) => {
  if (item === null) {
    return;
  }

  shown.value = item;
  const known = pickable.value.some((candidate) => candidate.id === item.matchId);

  const blue =
    item.status === "unmatched" || item.status === "failed" ? item.blueParticipantId : null;

  matchId.value = known ? (item.matchId ?? undefined) : undefined;
  blueParticipantId.value = known ? (blue ?? undefined) : undefined;
  gameNumber.value = known && item.status === "failed" ? item.gameNumber : undefined;
});

watch(matchId, () => {
  if (
    !match.value?.participants.some((participant) => participant.id === blueParticipantId.value)
  ) {
    blueParticipantId.value = undefined;
  }

  if (!gameOptions.value.some((option) => option.value === gameNumber.value)) {
    gameNumber.value = undefined;
  }
});

const canSave = computed(
  () => !!matchId.value && !!gameNumber.value && !!blueParticipantId.value && !saving.value,
);

const save = async () => {
  const item = target.value;

  if (!item || !matchId.value || !gameNumber.value || !blueParticipantId.value) {
    return;
  }

  saving.value = true;

  try {
    const replay = { blueParticipantId: blueParticipantId.value, replay: item.replayId };

    const game = appending.value
      ? await appendStatsReplay(tournamentId, matchId.value, gameNumber.value, replay)
      : await attachStatsReplay(tournamentId, {
          ...replay,
          gameNumber: gameNumber.value,
          matchId: matchId.value,
        });

    toast.add({
      color: "success",
      title: appending.value
        ? t("page.tournaments.statsAttach.appended", { number: game.number })
        : t("page.tournaments.statsAttach.saved", { number: game.number }),
    });
    emit("attached", game);
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
    :title="t('page.tournaments.statsAttach.title')"
    :description="t('page.tournaments.statsAttach.description', { title: shown?.title ?? '' })"
    :dismissible="!saving"
  >
    <template #body>
      <form id="stats-attach-replay" class="flex flex-col gap-4" @submit.prevent="save">
        <SFormField :label="t('page.tournaments.statsAttach.match')" required>
          <SCombobox
            v-model="matchId"
            :items="matchOptions"
            class="w-full"
            :placeholder="t('page.tournaments.statsAttach.matchPlaceholder')"
          />
        </SFormField>

        <SFormField :label="t('page.tournaments.statsAttach.game')" :help="gameHelp" required>
          <SSelect
            v-model="gameNumber"
            :items="gameOptions"
            class="w-full"
            :disabled="!matchId"
            :placeholder="t('page.tournaments.statsAttach.gamePlaceholder')"
          />
        </SFormField>

        <SFormField
          :label="t('page.tournaments.statsAttach.blue')"
          :help="t('page.tournaments.statsAttach.blueHelp')"
          required
        >
          <SRadioGroup v-if="matchId" v-model="blueParticipantId" :items="sideOptions" />
          <p v-else class="text-sm text-muted">
            {{ t("page.tournaments.statsAttach.chooseMatchFirst") }}
          </p>
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
          form="stats-attach-replay"
          icon="i-fluent-link-24-regular"
          :label="t('page.tournaments.statsAttach.submit')"
          :loading="saving"
          :disabled="!canSave"
        />
      </div>
    </template>
  </SModal>
</template>
