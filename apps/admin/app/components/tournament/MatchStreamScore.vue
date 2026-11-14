<script lang="ts" setup>
import type { StreamScoreSide, TournamentMatchListItem } from "@sarpbc/types";
import {
  parseStreamScoreProposal,
  participantName,
  streamScoreBestOfMismatch,
  streamScoreConfirmBlockers,
  streamScoreGameNeedsCheck,
  streamScoreSeriesResults,
} from "@sarpbc/utils";

const { match, label } = defineProps<{
  match: TournamentMatchListItem;
  label: string;
}>();

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ confirmed: [] }>();

const { t } = useI18n();
const toast = useToast();
const reportError = useReportError();

const text = ref("");
const blueId = ref<string | undefined>(undefined);
const checkedGames = ref<number[]>([]);
const bestOfAcknowledged = ref(false);
const confirming = ref(false);

const parsed = computed(() =>
  text.value.trim() === "" ? null : parseStreamScoreProposal(text.value),
);

const proposal = computed(() => (parsed.value?.ok ? parsed.value.proposal : null));

const sides = computed(() =>
  match.participants.map((participant) => ({
    value: participant.id,
    label: participantName(participant),
  })),
);

const orangeId = computed(() =>
  sides.value.length === 2
    ? sides.value.find((side) => side.value !== blueId.value)?.value
    : undefined,
);

function sideId(side: StreamScoreSide): string | undefined {
  switch (side) {
    case "blue": {
      return blueId.value;
    }

    case "orange": {
      return blueId.value === undefined ? undefined : orangeId.value;
    }

    default: {
      const exhaustive: never = side;

      return exhaustive;
    }
  }
}

function sideName(side: StreamScoreSide): string {
  const id = sideId(side);

  return (
    sides.value.find((candidate) => candidate.value === id)?.label ??
    t(`page.tournaments.streamScore.side.${side}`)
  );
}

const bestOfMismatch = computed(
  () => proposal.value !== null && streamScoreBestOfMismatch(proposal.value, match.numberOfGames),
);

const blockers = computed(() =>
  proposal.value
    ? streamScoreConfirmBlockers(proposal.value, {
        numberOfGames: match.numberOfGames,
        checkedGames: new Set(checkedGames.value),
        bestOfAcknowledged: bestOfAcknowledged.value,
      })
    : [],
);

const results = computed(() => {
  const blue = sideId("blue");
  const orange = sideId("orange");

  if (!proposal.value || blue === undefined || orange === undefined) {
    return null;
  }

  return streamScoreSeriesResults(proposal.value.series, { blue, orange });
});

const canConfirm = computed(() => results.value !== null && blockers.value.length === 0);

function formatOffset(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(Math.floor(seconds % 60)).padStart(2, "0");

  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

function setGameChecked(number: number, checked: boolean) {
  checkedGames.value = checked
    ? [...checkedGames.value, number]
    : checkedGames.value.filter((game) => game !== number);
}

watch(proposal, () => {
  checkedGames.value = [];
  bestOfAcknowledged.value = false;
});

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  text.value = "";
  blueId.value = undefined;
});

async function confirm() {
  const series = results.value;

  if (!series || !canConfirm.value) {
    return;
  }

  confirming.value = true;

  try {
    await setMatchResult(match.id, series);
    toast.add({ title: t("page.tournaments.streamScore.confirmed"), color: "success" });
    emit("confirmed");
    open.value = false;
  } catch (confirmError) {
    reportError(confirmError);
  } finally {
    confirming.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('page.tournaments.streamScore.title', { match: label })"
    :description="t('page.tournaments.streamScore.description')"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField
          :label="t('page.tournaments.streamScore.paste')"
          :help="t('page.tournaments.streamScore.pasteHelp')"
          :error="
            parsed && !parsed.ok
              ? t(`page.tournaments.streamScore.errors.${parsed.error}`)
              : undefined
          "
        >
          <UTextarea v-model="text" :rows="5" autoresize :maxrows="12" class="w-full font-mono" />
        </UFormField>

        <p v-if="sides.length !== 2" class="text-sm text-error">
          {{ t("page.tournaments.streamScore.needsTwoSides") }}
        </p>

        <template v-else-if="proposal">
          <UFormField :label="t('page.tournaments.streamScore.blueSide')">
            <USelect
              v-model="blueId"
              :items="sides"
              value-key="value"
              label-key="label"
              class="w-full"
              :placeholder="t('page.tournaments.streamScore.chooseBlue')"
            />
          </UFormField>

          <label v-if="bestOfMismatch" class="flex items-start gap-2 text-sm text-warning">
            <UCheckbox v-model="bestOfAcknowledged" />
            <span>
              {{
                t("page.tournaments.streamScore.bestOfMismatch", {
                  read: proposal.bestOf,
                  match: match.numberOfGames,
                })
              }}
            </span>
          </label>

          <ol
            v-if="proposal.games.length > 0"
            class="divide-y divide-default border-y border-default"
          >
            <li
              v-for="game in proposal.games"
              :key="game.number"
              class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
            >
              <span class="flex min-w-0 flex-col">
                <span class="font-medium text-highlighted tabular-nums">
                  {{ t("page.tournaments.streamScore.game", { number: game.number }) }} ·
                  {{ sideName("blue") }} {{ game.blue }} – {{ game.orange }}
                  {{ sideName("orange") }}
                </span>
                <span class="text-muted tabular-nums">
                  {{ t(`page.tournaments.streamScore.endedBy.${game.endedBy}`) }} ·
                  {{ formatOffset(game.endedAt) }} ·
                  {{
                    t("page.tournaments.streamScore.confidence", {
                      percent: Math.round(game.confidence * 100),
                    })
                  }}
                </span>
              </span>
              <UBadge v-if="game.winner === null" color="error" variant="subtle" size="sm">
                {{ t("page.tournaments.streamScore.unread") }}
              </UBadge>
              <label
                v-else-if="streamScoreGameNeedsCheck(game)"
                class="flex items-center gap-2 text-warning"
              >
                <UCheckbox
                  :model-value="checkedGames.includes(game.number)"
                  @update:model-value="setGameChecked(game.number, Boolean($event))"
                />
                <span>{{ t("page.tournaments.streamScore.checked") }}</span>
              </label>
            </li>
          </ol>
          <p v-else class="text-sm text-muted">{{ t("page.tournaments.streamScore.noGames") }}</p>

          <p
            v-if="proposal.series.winner"
            class="text-sm font-medium text-highlighted tabular-nums"
          >
            {{
              t("page.tournaments.streamScore.series", {
                winner: sideName(proposal.series.winner),
                blue: proposal.series.blue,
                orange: proposal.series.orange,
              })
            }}
          </p>

          <p class="text-sm break-all text-muted">
            {{ t("page.tournaments.streamScore.source", { source: proposal.source }) }}
          </p>

          <ul v-if="blockers.length > 0" class="flex flex-col gap-1 text-sm text-warning">
            <li v-for="blocker in blockers" :key="blocker">
              {{ t(`page.tournaments.streamScore.blockers.${blocker}`) }}
            </li>
          </ul>

          <p class="text-sm text-muted">{{ t("page.tournaments.streamScore.saved") }}</p>
          <p class="text-sm text-muted">{{ t("page.tournaments.streamScore.officialSource") }}</p>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('common.cancel')"
          @click="open = false"
        />
        <UButton
          :loading="confirming"
          :disabled="!canConfirm"
          icon="i-fluent-trophy-24-regular"
          :label="
            proposal && canConfirm
              ? t('page.tournaments.streamScore.confirm', {
                  blue: sideName('blue'),
                  orange: sideName('orange'),
                  blueScore: proposal.series.blue,
                  orangeScore: proposal.series.orange,
                })
              : t('page.tournaments.streamScore.confirmDisabled')
          "
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>
