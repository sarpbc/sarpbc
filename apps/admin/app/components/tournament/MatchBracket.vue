<script lang="ts" setup>
import type {
  BracketLinkType,
  TournamentDetailMatch,
  TournamentDetailParticipant,
} from "@sarpbc/types";
import { participantName } from "@sarpbc/utils";

interface LinkRow {
  key: number;
  previousMatchId: string;
  type: BracketLinkType;
}

const MAX_LINKS = 2;
const TBD = "tbd";

const { match, label, participants, stageMatches } = defineProps<{
  match: TournamentDetailMatch;
  label: string;
  participants: TournamentDetailParticipant[];
  stageMatches: TournamentDetailMatch[];
}>();

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ saved: [] }>();

const { t } = useI18n();
const toast = useToast();
const reportError = useReportError();

const sides = ref<string[]>([]);
const links = ref<LinkRow[]>([]);
const saving = ref(false);
let nextKey = 0;

function reset() {
  sides.value = [0, 1].map((index) => match.participants[index]?.id ?? TBD);
  links.value = match.previousMatches.map(({ previousMatch, type }) => ({
    key: (nextKey += 1),
    previousMatchId: previousMatch,
    type,
  }));
}

watch(
  open,
  (isOpen) => {
    if (isOpen) reset();
  },
  { immediate: true },
);

const participantItems = computed(() => [
  { value: TBD, label: t("page.tournaments.bracket.tbd") },
  ...participants.map((participant) => ({
    value: participant.id,
    label: participantName(participant),
  })),
]);

function stageMatchLabel(candidate: TournamentDetailMatch): string {
  const [first, second] = candidate.participants;
  const tbd = t("page.tournaments.bracket.tbd");

  return `${candidate.name} · ${first ? participantName(first) : tbd} vs ${second ? participantName(second) : tbd}`;
}

const matchItems = computed(() =>
  stageMatches
    .filter((candidate) => candidate.id !== match.id)
    .map((candidate) => ({ value: candidate.id, label: stageMatchLabel(candidate) })),
);

const typeItems = computed(() => [
  { value: "winner", label: t("page.tournaments.bracket.types.winner") },
  { value: "loser", label: t("page.tournaments.bracket.types.loser") },
]);

const chosenSides = computed(() => sides.value.filter((side) => side !== TBD));

const canSave = computed(
  () =>
    new Set(chosenSides.value).size === chosenSides.value.length &&
    links.value.every((link) => link.previousMatchId) &&
    new Set(links.value.map((link) => link.previousMatchId)).size === links.value.length,
);

function addLink() {
  links.value.push({ key: (nextKey += 1), previousMatchId: "", type: "winner" });
}

function removeLink(key: number) {
  links.value = links.value.filter((link) => link.key !== key);
}

async function save() {
  saving.value = true;

  try {
    await setMatchBracket(match.id, {
      participantIds: chosenSides.value,
      previousMatches: links.value.map(({ previousMatchId, type }) => ({ previousMatchId, type })),
    });
    toast.add({ title: t("page.tournaments.bracket.saved"), color: "success" });
    open.value = false;
    emit("saved");
  } catch (error) {
    reportError(error, t("page.tournaments.bracket.saveError"));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('page.tournaments.bracket.title', { match: label })"
    :description="t('page.tournaments.bracket.description')"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="grid gap-2 sm:grid-cols-2">
          <UFormField
            v-for="(_, index) in sides"
            :key="index"
            :label="t('page.tournaments.bracket.side', { number: index + 1 })"
          >
            <USelect
              v-model="sides[index]"
              :items="participantItems"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="flex flex-col gap-2">
          <p class="text-sm font-medium text-highlighted">
            {{ t("page.tournaments.bracket.feeders") }}
          </p>
          <p v-if="links.length === 0" class="text-sm text-muted">
            {{ t("page.tournaments.bracket.noFeeders") }}
          </p>
          <div
            v-for="link in links"
            :key="link.key"
            class="grid grid-cols-1 gap-2 border border-default p-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end"
          >
            <UFormField :label="t('page.tournaments.bracket.previousMatch')">
              <USelect
                v-model="link.previousMatchId"
                :items="matchItems"
                value-key="value"
                label-key="label"
                class="w-full"
                :placeholder="t('page.tournaments.bracket.choosePreviousMatch')"
              />
            </UFormField>
            <UFormField :label="t('page.tournaments.bracket.type')">
              <USelect
                v-model="link.type"
                :items="typeItems"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>
            <UButton
              color="error"
              variant="ghost"
              icon="i-fluent-delete-24-regular"
              :aria-label="t('page.tournaments.bracket.removeFeeder')"
              @click="removeLink(link.key)"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-row flex-wrap justify-between gap-2">
        <UButton
          variant="soft"
          icon="i-fluent-add-24-regular"
          :label="t('page.tournaments.bracket.addFeeder')"
          :disabled="links.length >= MAX_LINKS || matchItems.length === 0"
          @click="addLink"
        />
        <div class="flex flex-row gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :label="t('page.tournaments.bracket.cancel')"
            @click="open = false"
          />
          <UButton
            :label="t('page.tournaments.bracket.save')"
            :loading="saving"
            :disabled="!canSave"
            @click="save"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
