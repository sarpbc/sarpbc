<script lang="ts" setup>
export interface OffseasonOfferItem {
  teamId: string;
  name: string;
  rank: number | null;
}

const props = defineProps<{
  offers: OffseasonOfferItem[];
  currentTeamName: string;
  currentTeamRank: number | null;
  renewalOffered: boolean;
  isLastChanceOffer: boolean;
  canRetire: boolean;
  destinyPromptPending: boolean;
}>();

const emit = defineEmits<{
  accept: [teamId: string];
  stay: [];
  retire: [];
  destiny: [choiceId: string];
}>();

const { t } = useI18n();

const hasOffers = computed(() => props.offers.length > 0);
const showCurrentTeamRow = computed(() => props.renewalOffered);
const showOfferList = computed(() => hasOffers.value || showCurrentTeamRow.value);

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
  if (hasOffers.value) return t("page.game.career.offseason.title");
  if (props.renewalOffered) return t("page.game.career.offseason.renewalTitle");
  return t("page.game.career.offseason.unsignedTitle");
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="space-y-0.5 text-center">
      <h2 class="text-lg font-semibold tracking-tight">{{ title }}</h2>
      <p class="text-sm text-muted text-pretty">{{ body }}</p>
    </div>

    <template v-if="destinyPromptPending">
      <div class="flex flex-col gap-2">
        <UButton variant="outline" class="justify-start text-left" @click="emit('destiny', 'quit')">
          {{ t("page.game.career.offseason.prompt.quit") }}
        </UButton>
        <UButton
          variant="outline"
          class="justify-start text-left"
          @click="emit('destiny', 'streamer')"
        >
          {{ t("page.game.career.offseason.prompt.streamer") }}
        </UButton>
        <UButton
          variant="outline"
          class="justify-start text-left"
          @click="emit('destiny', 'coach')"
        >
          {{ t("page.game.career.offseason.prompt.coach") }}
        </UButton>
      </div>
    </template>

    <template v-else>
      <div v-if="showOfferList" class="border border-default">
        <p class="border-b border-default px-3 py-2 text-xs font-semibold text-muted">
          {{
            isLastChanceOffer
              ? t("page.game.career.offseason.lastChanceTeam")
              : t("page.game.career.offseason.offerTeam")
          }}
        </p>
        <div
          v-for="offer in offers"
          :key="offer.teamId"
          class="flex items-center gap-3 border-b border-default px-3 py-3 last:border-b-0"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">{{ offer.name }}</p>
            <p v-if="offer.rank" class="text-xs text-muted tabular-nums">
              {{ t("page.game.career.offseason.worldRank", { rank: offer.rank }) }}
            </p>
          </div>
          <UButton class="shrink-0" @click="emit('accept', offer.teamId)">
            {{ t("page.game.career.offseason.accept") }}
          </UButton>
        </div>
        <div v-if="showCurrentTeamRow" class="flex items-center gap-3 px-3 py-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">{{ currentTeamName }}</p>
            <p v-if="currentTeamRank" class="text-xs text-muted tabular-nums">
              {{ t("page.game.career.offseason.worldRank", { rank: currentTeamRank }) }}
            </p>
          </div>
          <UButton
            class="shrink-0"
            :variant="hasOffers ? 'outline' : 'solid'"
            @click="emit('stay')"
          >
            {{ t("page.game.career.offseason.continue") }}
          </UButton>
        </div>
      </div>
      <div v-else class="border border-default p-3 text-center">
        <p class="text-xs text-muted">{{ t("page.game.career.offseason.offerTeam") }}</p>
        <p class="mt-1 text-sm text-muted">{{ t("page.game.career.offseason.noOffer") }}</p>
      </div>

      <p v-if="!hasOffers && !renewalOffered" class="text-center text-xs text-muted">
        {{ t("page.game.career.offseason.unsignedHint") }}
      </p>

      <UButton
        v-if="canRetire"
        :variant="hasOffers || renewalOffered ? 'ghost' : 'solid'"
        :color="hasOffers || renewalOffered ? 'neutral' : 'primary'"
        @click="emit('retire')"
      >
        {{ t("page.game.career.offseason.retire") }}
      </UButton>
    </template>
  </div>
</template>
