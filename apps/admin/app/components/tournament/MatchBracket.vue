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

const reset = () => {
  sides.value = [0, 1].map((index) => match.participants[index]?.id ?? TBD);
  links.value = match.previousMatches.map(({ previousMatch, type }) => ({
    key: (nextKey += 1),
    previousMatchId: previousMatch,
    type,
  }));
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

const participantItems = computed(() => [
  { label: t("page.tournaments.bracket.tbd"), value: TBD },
  ...participants.map((participant) => ({
    label: participantName(participant),
    value: participant.id,
  })),
]);

const stageMatchLabel = (candidate: TournamentDetailMatch) => {
  const [first, second] = candidate.participants;
  const tbd = t("page.tournaments.bracket.tbd");

  return `${candidate.name} · ${first ? participantName(first) : tbd} vs ${second ? participantName(second) : tbd}`;
};

const matchItems = computed(() =>
  stageMatches
    .filter((candidate) => candidate.id !== match.id)
    .map((candidate) => ({ label: stageMatchLabel(candidate), value: candidate.id })),
);

const typeItems = computed(() => [
  { label: t("page.tournaments.bracket.types.winner"), value: "winner" },
  { label: t("page.tournaments.bracket.types.loser"), value: "loser" },
]);

const chosenSides = computed(() => sides.value.filter((side) => side !== TBD));

const canSave = computed(
  () =>
    new Set(chosenSides.value).size === chosenSides.value.length &&
    links.value.every((link) => link.previousMatchId) &&
    new Set(links.value.map((link) => link.previousMatchId)).size === links.value.length,
);

const addLink = () => {
  links.value.push({ key: (nextKey += 1), previousMatchId: "", type: "winner" });
};

const removeLink = (key: number) => {
  links.value = links.value.filter((link) => link.key !== key);
};

const save = async () => {
  saving.value = true;

  try {
    await setMatchBracket(match.id, {
      participantIds: chosenSides.value,
      previousMatches: links.value.map(({ previousMatchId, type }) => ({ previousMatchId, type })),
    });
    toast.add({ color: "success", title: t("page.tournaments.bracket.saved") });
    open.value = false;
    emit("saved");
  } catch (error) {
    reportError(error, t("page.tournaments.bracket.saveError"));
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <SModal
    v-model:open="open"
    :title="t('page.tournaments.bracket.title', { match: label })"
    :description="t('page.tournaments.bracket.description')"
    size="lg"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="grid gap-2 sm:grid-cols-2">
          <SFormField
            v-for="(_, index) in sides"
            :key="index"
            :label="t('page.tournaments.bracket.side', { number: index + 1 })"
          >
            <SSelect v-model="sides[index]" :items="participantItems" class="w-full" />
          </SFormField>
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
            <SFormField :label="t('page.tournaments.bracket.previousMatch')">
              <SSelect
                v-model="link.previousMatchId"
                :items="matchItems"
                class="w-full"
                :placeholder="t('page.tournaments.bracket.choosePreviousMatch')"
              />
            </SFormField>
            <SFormField :label="t('page.tournaments.bracket.type')">
              <SSelect v-model="link.type" :items="typeItems" class="w-full" />
            </SFormField>
            <SButton
              variant="tertiary"
              danger
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
        <SButton
          variant="secondary"
          icon="i-fluent-add-24-regular"
          :label="t('page.tournaments.bracket.addFeeder')"
          :disabled="links.length >= MAX_LINKS || matchItems.length === 0"
          @click="addLink"
        />
        <div class="flex flex-row gap-2">
          <SButton
            variant="tertiary"
            :label="t('page.tournaments.bracket.cancel')"
            @click="open = false"
          />
          <SButton
            :label="t('page.tournaments.bracket.save')"
            :loading="saving"
            :disabled="!canSave"
            @click="save"
          />
        </div>
      </div>
    </template>
  </SModal>
</template>
