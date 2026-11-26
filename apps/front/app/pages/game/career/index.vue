<script lang="ts" setup>
import CareerMenu from "~/components/career/Menu.vue";
import CareerPhaseView from "~/components/career/CareerPhaseView.vue";
import CareerEnd from "~/components/career/CareerEnd.vue";
import { encodeCareerResultForShare } from "~/composables/use-career-storage";
import { useCareerSimulator } from "~/composables/use-career-simulator";

await useCareerMessages();

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
  description: t("page.game.career.seo.description"),
  title: t("page.game.career.seo.title"),
});

const handleShare = () => {
  if (!state.value.result) {
    return;
  }

  const encoded = encodeCareerResultForShare(state.value.result);
  const url = `${window.location.origin}${localePath(`/game/career/${state.value.result.id}`)}?d=${encoded}`;
  void navigator.clipboard.writeText(url);
};

const handlePlayAgain = () => {
  resetCareer();
};

type PendingConfirm = "abandon" | "newCareer";

const pendingConfirm = ref<PendingConfirm | undefined>(undefined);

const confirmOpen = computed({
  get: () => pendingConfirm.value !== undefined,
  set: (open) => {
    if (!open) {
      pendingConfirm.value = undefined;
    }
  },
});

const confirmCopy = computed(() => {
  switch (pendingConfirm.value) {
    case "abandon": {
      return {
        action: t("page.game.career.actions.abandon"),
        title: t("page.game.career.actions.abandonConfirm"),
      };
    }

    case "newCareer": {
      return {
        action: t("page.game.career.menu.newCareer"),
        title: t("page.game.career.menu.newCareerConfirm"),
      };
    }

    case undefined: {
      return { action: "", title: "" };
    }

    default: {
      const exhaustive: never = pendingConfirm.value;

      return exhaustive;
    }
  }
});

const handleAbandon = () => {
  pendingConfirm.value = "abandon";
};

const handleNewCareer = () => {
  if (canContinue.value) {
    pendingConfirm.value = "newCareer";

    return;
  }

  startOnboarding();
};

const confirmPending = () => {
  const confirmed = pendingConfirm.value;
  pendingConfirm.value = undefined;

  if (confirmed === "abandon") {
    returnToMenu();
  } else if (confirmed === "newCareer") {
    startOnboarding();
  }
};

const handleContinue = () => {
  continueFromMenu();
};
</script>

<template>
  <section class="flex w-full flex-col gap-4">
    <HubCrossCard
      v-if="state.phase === 'menu' || state.phase === 'career_end'"
      class="min-h-row-header"
    >
      <div class="flex w-full flex-col items-center justify-center gap-1 py-3 text-center">
        <h1 class="text-xl font-medium tracking-tight">
          {{ t("page.game.career.title") }}
        </h1>
        <p class="text-sm text-muted">{{ t("page.game.career.subtitle") }}</p>
      </div>
    </HubCrossCard>

    <HubCard v-if="!hydrated" class="p-6">
      <div class="flex flex-col items-center gap-4">
        <SSkeleton class="h-4 w-48" />
        <SSkeleton class="h-24 w-full" />
      </div>
    </HubCard>

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

    <SModal v-model:open="confirmOpen" :title="confirmCopy.title">
      <template #footer>
        <SButton danger :label="confirmCopy.action" @click="confirmPending" />
        <SButton variant="secondary" :label="t('common.cancel')" @click="confirmOpen = false" />
      </template>
    </SModal>
  </section>
</template>
