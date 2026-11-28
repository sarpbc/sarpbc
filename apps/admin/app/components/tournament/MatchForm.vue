<script lang="ts" setup>
import type { TournamentDetailMatch, TournamentDetailParticipant } from "@sarpbc/types";
import { participantName } from "@sarpbc/utils";

const STATUSES = ["not_started", "running", "finished"] as const;

const {
  tournamentId,
  participants,
  match = null,
} = defineProps<{
  tournamentId: string;
  participants: TournamentDetailParticipant[];
  match?: TournamentDetailMatch | null;
}>();

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ saved: [] }>();

const { t } = useI18n();
const toast = useToast();
const reportError = useReportError();

const name = ref("");
const sides = ref<string[]>(["", ""]);
const numberOfGames = ref<number | null>(null);
const beginAt = ref("");
const endAt = ref("");
const status = ref<EditableMatchStatus>("not_started");
const scores = ref<(number | null)[]>([0, 0]);
const saving = ref(false);

const toEditableStatus = (value: string | null | undefined) =>
  STATUSES.find((candidate) => candidate === value) ?? "not_started";

const scoreOf = (participantId: string | undefined) =>
  match?.results.find((result) => result.participant === participantId)?.score ?? 0;

const reset = () => {
  name.value = match?.name ?? "";
  sides.value = [0, 1].map((index) => match?.participants[index]?.id ?? "");
  numberOfGames.value = match?.numberOfGames ?? null;
  beginAt.value = formatDateTimeForInput(match?.beginAt);
  endAt.value = formatDateTimeForInput(match?.endAt);
  status.value = toEditableStatus(match?.status);
  scores.value = sides.value.map((side) => scoreOf(side));
};

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      reset();
    }
  },
  { immediate: true },
);

const participantItems = computed(() =>
  participants.map((participant) => ({
    label: participantName(participant),
    value: participant.id,
  })),
);

const statusItems = computed(() =>
  STATUSES.map((value) => ({ label: t(`page.tournaments.matchForm.statuses.${value}`), value })),
);

const sideName = (index: number) => {
  const participant = participants.find((candidate) => candidate.id === sides.value[index]);

  return participant
    ? participantName(participant)
    : t("page.tournaments.matchForm.side", { number: index + 1 });
};

const hasSides = computed(() => sides.value.every((side) => side !== ""));
const sameSides = computed(() => hasSides.value && sides.value[0] === sides.value[1]);
const scored = computed(() => hasSides.value && status.value !== "not_started");

const drawnFinished = computed(
  () => scored.value && status.value === "finished" && scores.value[0] === scores.value[1],
);

const canSave = computed(
  () =>
    name.value.trim() !== "" &&
    (match !== null || (hasSides.value && !sameSides.value)) &&
    !drawnFinished.value,
);

const toIso = (value: string) => (value === "" ? null : new Date(value).toISOString());

const results = () =>
  scored.value
    ? sides.value.map((participantId, index) => ({
        participantId,
        score: scores.value[index] ?? 0,
      }))
    : undefined;

const sameDate = (value: string, current: Date | string | null) =>
  value === formatDateTimeForInput(current);

const changes = (current: TournamentDetailMatch) => {
  const sentScores = results();

  const scoresChanged = sentScores?.some(
    ({ participantId, score }) => score !== scoreOf(participantId),
  );

  return {
    beginAt: sameDate(beginAt.value, current.beginAt) ? undefined : toIso(beginAt.value),
    endAt: sameDate(endAt.value, current.endAt) ? undefined : toIso(endAt.value),
    name: name.value.trim() === current.name ? undefined : name.value.trim(),
    numberOfGames: numberOfGames.value === current.numberOfGames ? undefined : numberOfGames.value,
    results: scoresChanged ? sentScores : undefined,
    status: status.value === toEditableStatus(current.status) ? undefined : status.value,
  } satisfies UpdateMatchInput;
};

const save = async () => {
  if (!canSave.value || saving.value) {
    return;
  }

  saving.value = true;

  try {
    if (match) {
      const body = changes(match);

      if (Object.values(body).every((value) => value === undefined)) {
        toast.add({ color: "info", title: t("page.tournaments.matchForm.unchanged") });
        open.value = false;

        return;
      }

      await updateMatch(match.id, body);
    } else {
      await createMatch(tournamentId, {
        beginAt: toIso(beginAt.value) ?? undefined,
        endAt: toIso(endAt.value) ?? undefined,
        name: name.value.trim(),
        numberOfGames: numberOfGames.value ?? undefined,
        participantIds: sides.value,
        results: results(),
        status: status.value,
      });
    }

    toast.add({ color: "success", title: t("page.tournaments.matchForm.saved") });
    open.value = false;
    emit("saved");
  } catch (error) {
    reportError(error, t("page.tournaments.matchForm.saveError"));
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <SModal
    v-model:open="open"
    :title="
      match
        ? t('page.tournaments.matchForm.editTitle', { match: match.name })
        : t('page.tournaments.matchForm.createTitle')
    "
    :description="t('page.tournaments.matchForm.description')"
    size="lg"
  >
    <template #body>
      <form class="flex flex-col gap-4" @submit.prevent="save">
        <SFormField :label="t('page.tournaments.matchForm.name')" required>
          <SInput
            v-model="name"
            :placeholder="t('page.tournaments.matchForm.namePlaceholder')"
            class="w-full"
          />
        </SFormField>

        <div v-if="!match" class="grid gap-2 sm:grid-cols-2">
          <SFormField
            v-for="(_, index) in sides"
            :key="index"
            :label="t('page.tournaments.matchForm.side', { number: index + 1 })"
            :error="index === 1 && sameSides ? t('page.tournaments.matchForm.sameSides') : null"
            required
          >
            <SSelect
              v-model="sides[index]"
              :items="participantItems"
              :placeholder="t('page.tournaments.matchForm.chooseSide')"
              class="w-full"
            />
          </SFormField>
        </div>
        <p v-else class="text-sm text-muted">{{ t("page.tournaments.matchForm.sidesHelp") }}</p>

        <div class="grid gap-2 sm:grid-cols-2">
          <SFormField :label="t('page.tournaments.matchForm.status')">
            <SSelect v-model="status" :items="statusItems" class="w-full" />
          </SFormField>
          <SFormField
            :label="t('page.tournaments.matchForm.numberOfGames')"
            :help="t('page.tournaments.matchForm.numberOfGamesHelp')"
          >
            <SInputNumber v-model="numberOfGames" :min="1" :max="9" class="w-full" />
          </SFormField>
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <SFormField :label="t('page.tournaments.matchForm.beginAt')">
            <SInput v-model="beginAt" type="datetime-local" class="w-full" />
          </SFormField>
          <SFormField
            :label="t('page.tournaments.matchForm.endAt')"
            :help="t('page.tournaments.matchForm.endAtHelp')"
          >
            <SInput v-model="endAt" type="datetime-local" class="w-full" />
          </SFormField>
        </div>

        <div v-if="scored" class="grid gap-2 sm:grid-cols-2">
          <SFormField
            v-for="(_, index) in scores"
            :key="index"
            :label="t('page.tournaments.matchForm.score', { side: sideName(index) })"
            :error="
              index === 1 && drawnFinished ? t('page.tournaments.matchForm.drawnFinished') : null
            "
          >
            <SInputNumber v-model="scores[index]" :min="0" :max="9" class="w-full" />
          </SFormField>
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full flex-row justify-end gap-2">
        <SButton
          variant="tertiary"
          :label="t('page.tournaments.matchForm.cancel')"
          @click="open = false"
        />
        <SButton
          :label="
            match ? t('page.tournaments.matchForm.save') : t('page.tournaments.matchForm.create')
          "
          :loading="saving"
          :disabled="!canSave"
          @click="save"
        />
      </div>
    </template>
  </SModal>
</template>
