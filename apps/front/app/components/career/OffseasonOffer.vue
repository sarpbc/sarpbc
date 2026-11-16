<script lang="ts" setup>
interface OffseasonOfferItem {
  teamId: string;
  name: string;
  rank: number | null;
}

const {
  offers,
  currentTeamId,
  currentTeamName,
  currentTeamRank,
  renewalOffered,
  isLastChanceOffer,
  canRetire,
  destinyPromptPending,
  hoveredTeamId,
} = defineProps<{
  offers: OffseasonOfferItem[];
  currentTeamId: string;
  currentTeamName: string;
  currentTeamRank: number | null;
  renewalOffered: boolean;
  isLastChanceOffer: boolean;
  canRetire: boolean;
  destinyPromptPending: boolean;
  hoveredTeamId: string | null;
}>();

const emit = defineEmits<{
  accept: [teamId: string];
  stay: [];
  retire: [];
  destiny: [choiceId: string];
  "update:hoveredTeamId": [teamId: string | null];
}>();

const { t } = useI18n();

const destinyPromptChoices = [
  { endsCareer: true, id: "quit" },
  { endsCareer: true, id: "streamer" },
  { endsCareer: false, id: "coach" },
] as const;

const destinyItems = computed(() =>
  destinyPromptChoices.map((choice) => ({
    danger: choice.endsCareer,
    description: choice.endsCareer
      ? t("page.game.career.offseason.prompt.endsCareer")
      : t("page.game.career.offseason.prompt.playOn"),
    label: t(`page.game.career.offseason.prompt.${choice.id}`),
    value: choice.id,
  })),
);

const hasOffers = computed(() => offers.length > 0);
const showCurrentTeamRow = computed(() => renewalOffered);

const showChoiceList = computed(() => hasOffers.value || showCurrentTeamRow.value || canRetire);

const showCurrentTeamIndicator = computed(() => !destinyPromptPending && Boolean(currentTeamName));

const body = computed(() => {
  if (destinyPromptPending) {
    return t("page.game.career.offseason.prompt.body");
  }

  if (isLastChanceOffer && offers[0]) {
    return t("page.game.career.offseason.lastChanceBody", { team: offers[0].name });
  }

  if (hasOffers.value && renewalOffered) {
    return t("page.game.career.offseason.body", { count: offers.length });
  }

  if (hasOffers.value) {
    return t("page.game.career.offseason.noRenewalBody", { count: offers.length });
  }

  if (renewalOffered) {
    return t("page.game.career.offseason.renewalOnlyBody", { team: currentTeamName });
  }

  return t("page.game.career.offseason.unsignedBody");
});

const title = computed(() => {
  if (destinyPromptPending) {
    return t("page.game.career.offseason.prompt.title");
  }

  if (hasOffers.value) {
    return null;
  }

  if (renewalOffered) {
    return t("page.game.career.offseason.renewalTitle");
  }

  return t("page.game.career.offseason.unsignedTitle");
});

const setHoveredTeam = (teamId: string | null): void => {
  emit("update:hoveredTeamId", teamId);
};

const offerRowClass = (teamId: string, withBottomBorder: boolean): string[] => {
  const highlighted = hoveredTeamId === teamId;

  return [
    "grid grid-cols-[minmax(0,1fr)_max-content] items-center border-l-2",
    "hover:border-l-primary hover:bg-elevated",
    withBottomBorder ? "border-b border-separator" : "",
    highlighted ? "border-l-primary bg-elevated" : "border-l-transparent",
  ];
};

const retireRowClass = [
  "grid grid-cols-[minmax(0,1fr)_max-content] items-center border-l-2 border-l-transparent",
  "hover:bg-elevated",
];

const onRowLeave = (event: MouseEvent, teamId: string): void => {
  const { currentTarget: current, relatedTarget: next } = event;

  if (current instanceof Node && next instanceof Node && current.contains(next)) {
    return;
  }

  if (hoveredTeamId === teamId) {
    emit("update:hoveredTeamId", null);
  }
};

const onRowFocusOut = (event: FocusEvent, teamId: string): void => {
  const { currentTarget: current, relatedTarget: next } = event;

  if (current instanceof Node && next instanceof Node && current.contains(next)) {
    return;
  }

  if (hoveredTeamId === teamId) {
    emit("update:hoveredTeamId", null);
  }
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="space-y-0.5 text-center">
      <h2 v-if="title" class="text-lg font-medium tracking-tight">{{ title }}</h2>
      <p class="text-sm text-muted text-pretty">{{ body }}</p>
    </div>

    <p
      v-if="showCurrentTeamIndicator"
      class="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 text-center"
    >
      <span class="text-xs font-medium text-muted">
        {{ t("page.game.career.offseason.currentTeam") }}
      </span>
      <span class="text-sm font-medium">{{ currentTeamName }}</span>
      <span v-if="currentTeamRank" class="text-xs text-muted tabular-nums">
        {{ t("page.game.career.offseason.worldRank", { rank: currentTeamRank }) }}
      </span>
    </p>

    <template v-if="destinyPromptPending">
      <SActionList :items="destinyItems" @select="emit('destiny', $event)" />
    </template>

    <template v-else>
      <div v-if="showChoiceList" class="border border-separator">
        <div
          v-for="(offer, index) in offers"
          :key="offer.teamId"
          tabindex="0"
          :class="
            offerRowClass(
              offer.teamId,
              index < offers.length - 1 || showCurrentTeamRow || canRetire,
            )
          "
          @mouseenter="setHoveredTeam(offer.teamId)"
          @mouseleave="onRowLeave($event, offer.teamId)"
          @focusin="setHoveredTeam(offer.teamId)"
          @focusout="onRowFocusOut($event, offer.teamId)"
        >
          <div class="min-w-0 px-3 py-3">
            <p class="truncate text-sm font-medium">{{ offer.name }}</p>
            <p v-if="offer.rank" class="text-xs text-muted tabular-nums">
              {{ t("page.game.career.offseason.worldRank", { rank: offer.rank }) }}
            </p>
          </div>
          <div class="px-3 py-3">
            <SButton block @click="emit('accept', offer.teamId)">
              {{ t("page.game.career.offseason.accept") }}
            </SButton>
          </div>
        </div>
        <div
          v-if="showCurrentTeamRow"
          tabindex="0"
          :class="offerRowClass(currentTeamId, canRetire)"
          @mouseenter="setHoveredTeam(currentTeamId)"
          @mouseleave="onRowLeave($event, currentTeamId)"
          @focusin="setHoveredTeam(currentTeamId)"
          @focusout="onRowFocusOut($event, currentTeamId)"
        >
          <div class="min-w-0 px-3 py-3">
            <p class="truncate text-sm font-medium">{{ currentTeamName }}</p>
            <p v-if="currentTeamRank" class="text-xs text-muted tabular-nums">
              {{ t("page.game.career.offseason.worldRank", { rank: currentTeamRank }) }}
            </p>
          </div>
          <div class="px-3 py-3">
            <SButton variant="secondary" block @click="emit('stay')">
              {{ t("page.game.career.offseason.continue") }}
            </SButton>
          </div>
        </div>
        <div
          v-if="canRetire"
          tabindex="0"
          :class="retireRowClass"
          @mouseenter="setHoveredTeam(null)"
        >
          <div class="min-w-0 px-3 py-3">
            <p class="truncate text-sm font-medium">
              {{ t("page.game.career.offseason.retire") }}
            </p>
          </div>
          <div class="px-3 py-3">
            <SButton danger block @click="emit('retire')">
              {{ t("page.game.career.offseason.retire") }}
            </SButton>
          </div>
        </div>
      </div>
      <div v-else class="border border-separator p-3 text-center">
        <p class="text-sm text-muted">{{ t("page.game.career.offseason.noOffer") }}</p>
      </div>

      <p v-if="!hasOffers && !renewalOffered" class="text-center text-xs text-muted">
        {{ t("page.game.career.offseason.unsignedHint") }}
      </p>
    </template>
  </div>
</template>
