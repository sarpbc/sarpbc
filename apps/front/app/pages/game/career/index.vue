<script lang="ts" setup>
import CareerMenu from "~/components/career/Menu.vue";
import CareerPhaseView from "~/components/career/CareerPhaseView.vue";
import CareerEnd from "~/components/career/CareerEnd.vue";
import { encodeCareerResultForShare } from "~/composables/useCareerStorage";
import { useCareerSimulator } from "~/composables/useCareerSimulator";

definePageMeta({
  layout: "game",
});

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const localePath = useLocalePath();

const sim = useCareerSimulator();
const {
  state,
  hydrated,
  canContinue,
  continueName,
  hydrate,
  resetCareer,
  startOnboarding,
  continueFromMenu,
  returnToMenu,
} = sim;

onMounted(() => {
  hydrate();
});

setPageSeo({
  title: t("page.game.career.seo.title"),
  description: t("page.game.career.seo.description"),
});

function handleShare() {
  if (!state.value.result) return;
  const encoded = encodeCareerResultForShare(state.value.result);
  const url = `${window.location.origin}${localePath(`/game/career/${state.value.result.id}`)}?d=${encoded}`;
  void navigator.clipboard.writeText(url);
}

function handlePlayAgain() {
  resetCareer();
}

function handleAbandon() {
  if (window.confirm(t("page.game.career.actions.abandonConfirm"))) {
    returnToMenu();
  }
}

function handleNewCareer() {
  if (canContinue.value && !window.confirm(t("page.game.career.menu.newCareerConfirm"))) {
    return;
  }
  startOnboarding();
}

function handleContinue() {
  continueFromMenu();
}
</script>

<template>
  <section class="flex w-full flex-col gap-4">
    <SCrossCard
      v-if="state.phase === 'menu' || state.phase === 'career_end'"
      class="min-h-row-header"
    >
      <div class="flex w-full flex-col items-center justify-center gap-1 py-3 text-center">
        <h1 class="text-xl font-semibold tracking-tight">
          {{ t("page.game.career.title") }}
        </h1>
        <p class="text-sm text-muted">{{ t("page.game.career.subtitle") }}</p>
      </div>
    </SCrossCard>

    <SCard v-if="!hydrated" class="p-6">
      <div class="flex flex-col items-center gap-4">
        <USkeleton class="h-4 w-48" />
        <USkeleton class="h-24 w-full" />
      </div>
    </SCard>

    <div v-else-if="state.phase === 'menu'" class="mx-auto w-full max-w-md">
      <CareerMenu
        :can-continue="canContinue"
        :continue-name="continueName"
        @new-career="handleNewCareer"
        @continue="handleContinue"
      />
    </div>

    <CareerEnd
      v-else-if="state.phase === 'career_end' && state.result"
      :result="state.result"
      @share="handleShare"
      @play-again="handlePlayAgain"
    />

    <CareerPhaseView
      v-else
      @share="handleShare"
      @play-again="handlePlayAgain"
      @abandon="handleAbandon"
    />
  </section>
</template>
