<script lang="ts" setup>
export interface OffseasonOfferItem {
  teamId: string;
  name: string;
  rank: number | null;
}

const props = defineProps<{
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
  { id: "quit", endsCareer: true },
  { id: "streamer", endsCareer: true },
  { id: "coach", endsCareer: false },
] as const;

const hasOffers = computed(() => props.offers.length > 0);
const showCurrentTeamRow = computed(() => props.renewalOffered);
const showChoiceList = computed(
  () => hasOffers.value || showCurrentTeamRow.value || props.canRetire,
);
const showCurrentTeamIndicator = computed(
  () => !props.destinyPromptPending && Boolean(props.currentTeamName),
);

const body = computed(() => {
  if (props.destinyPromptPending) {
    return t("page.game.career.offseason.prompt.body");
  }
  if (props.isLastChanceOffer && props.offers[0]) {
    return t("page.game.career.offseason.lastChanceBody", { team: props.offers[0].name });
  }
  if (hasOffers.value && props.renewalOffered) {
    return t("page.game.career.offseason.body", { count: props.offers.length });
  }
  if (hasOffers.value) {
    return t("page.game.career.offseason.noRenewalBody", { count: props.offers.length });
  }
  if (props.renewalOffered) {
    return t("page.game.career.offseason.renewalOnlyBody", { team: props.currentTeamName });
  }
  return t("page.game.career.offseason.unsignedBody");
});

const title = computed(() => {
  if (props.destinyPromptPending) return t("page.game.career.offseason.prompt.title");
  if (hasOffers.value) return null;
  if (props.renewalOffered) return t("page.game.career.offseason.renewalTitle");
  return t("page.game.career.offseason.unsignedTitle");
});

function setHoveredTeam(teamId: string | null): void {
  emit("update:hoveredTeamId", teamId);
}

function offerRowClass(teamId: string, withBottomBorder: boolean): string[] {
  const highlighted = props.hoveredTeamId === teamId;
  return [
    "grid grid-cols-[minmax(0,1fr)_max-content] items-center border-l-2",
    "hover:border-l-primary hover:bg-elevated",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
    withBottomBorder ? "border-b border-default" : "",
    highlighted ? "border-l-primary bg-elevated" : "border-l-transparent",
  ];
}

const retireRowClass = [
  "grid grid-cols-[minmax(0,1fr)_max-content] items-center border-l-2 border-l-transparent",
  "hover:bg-elevated",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
];

function onRowLeave(event: MouseEvent, teamId: string): void {
  const current = event.currentTarget as HTMLElement;
  const next = event.relatedTarget as Node | null;
  if (next && current.contains(next)) {
    return;
  }
  if (props.hoveredTeamId === teamId) {
    emit("update:hoveredTeamId", null);
  }
}

function onRowFocusOut(event: FocusEvent, teamId: string): void {
  const current = event.currentTarget as HTMLElement;
  const next = event.relatedTarget as Node | null;
  if (next && current.contains(next)) {
    return;
  }
  if (props.hoveredTeamId === teamId) {
    emit("update:hoveredTeamId", null);
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="space-y-0.5 text-center">
      <h2 v-if="title" class="text-lg font-semibold tracking-tight">{{ title }}</h2>
      <p class="text-sm text-muted text-pretty">{{ body }}</p>
    </div>

    <p
      v-if="showCurrentTeamIndicator"
      class="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 text-center"
    >
      <span class="text-xs font-semibold text-muted">
        {{ t("page.game.career.offseason.currentTeam") }}
      </span>
      <span class="text-sm font-medium">{{ currentTeamName }}</span>
      <span v-if="currentTeamRank" class="text-xs text-muted tabular-nums">
        {{ t("page.game.career.offseason.worldRank", { rank: currentTeamRank }) }}
      </span>
    </p>

    <template v-if="destinyPromptPending">
      <div class="border border-default">
        <button
          v-for="choice in destinyPromptChoices"
          :key="choice.id"
          type="button"
          class="w-full border-b border-default px-3 py-3 text-left last:border-b-0 touch-manipulation transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          @click="emit('destiny', choice.id)"
        >
          <span class="block text-sm">
            {{ t(`page.game.career.offseason.prompt.${choice.id}`) }}
          </span>
          <span
            class="mt-0.5 block text-xs"
            :class="choice.endsCareer ? 'text-error' : 'text-muted'"
          >
            {{
              choice.endsCareer
                ? t("page.game.career.offseason.prompt.endsCareer")
                : t("page.game.career.offseason.prompt.playOn")
            }}
          </span>
        </button>
      </div>
    </template>

    <template v-else>
      <div v-if="showChoiceList" class="border border-default">
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
            <p class="truncate text-sm font-semibold">{{ offer.name }}</p>
            <p v-if="offer.rank" class="text-xs text-muted tabular-nums">
              {{ t("page.game.career.offseason.worldRank", { rank: offer.rank }) }}
            </p>
          </div>
          <div class="px-3 py-3">
            <UButton color="primary" block @click="emit('accept', offer.teamId)">
              {{ t("page.game.career.offseason.accept") }}
            </UButton>
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
            <p class="truncate text-sm font-semibold">{{ currentTeamName }}</p>
            <p v-if="currentTeamRank" class="text-xs text-muted tabular-nums">
              {{ t("page.game.career.offseason.worldRank", { rank: currentTeamRank }) }}
            </p>
          </div>
          <div class="px-3 py-3">
            <UButton color="neutral" variant="soft" block @click="emit('stay')">
              {{ t("page.game.career.offseason.continue") }}
            </UButton>
          </div>
        </div>
        <div
          v-if="canRetire"
          tabindex="0"
          :class="retireRowClass"
          @mouseenter="setHoveredTeam(null)"
        >
          <div class="min-w-0 px-3 py-3">
            <p class="truncate text-sm font-semibold">
              {{ t("page.game.career.offseason.retire") }}
            </p>
          </div>
          <div class="px-3 py-3">
            <UButton color="error" block @click="emit('retire')">
              {{ t("page.game.career.offseason.retire") }}
            </UButton>
          </div>
        </div>
      </div>
      <div v-else class="border border-default p-3 text-center">
        <p class="text-sm text-muted">{{ t("page.game.career.offseason.noOffer") }}</p>
      </div>

      <p v-if="!hasOffers && !renewalOffered" class="text-center text-xs text-muted">
        {{ t("page.game.career.offseason.unsignedHint") }}
      </p>
    </template>
  </div>
</template>
