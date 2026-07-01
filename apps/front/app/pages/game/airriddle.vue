<script lang="ts" setup>
import { useMediaQuery } from "@vueuse/core";
import { motion } from "motion-v";
import { AirRiddleResultEnum } from "~/enums/airriddle-result.enum";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

interface GameAttempt {
  letters: string[];
  results?: AirRiddleResultEnum[];
}

interface GameState {
  targetLength: number;
  attempts: GameAttempt[];
  isWon: boolean;
  isGameOver: boolean;
}

const loading = ref(true);
const submitting = ref(false);
const maxAttempts = 6;
const error = ref<undefined | string>(undefined);
const answer = ref<string | undefined>(undefined);
const hiddenInputRef = useTemplateRef("hiddenInputRef");
const prefersReducedMotion = ref(false);
const isMobile = useMediaQuery("(max-width: 639px)");

const gameState = reactive<GameState>({
  targetLength: 0,
  attempts: [],
  isWon: false,
  isGameOver: false,
});

const targetLength = computed(() => gameState.targetLength);
const { currentGuess, canSubmit, appendToGuess, removeFromGuess, clearGuess } =
  useAirRiddleGuess(targetLength);

const canType = computed(
  () =>
    !loading.value &&
    gameState.targetLength > 0 &&
    !gameState.isWon &&
    !gameState.isGameOver &&
    !submitting.value,
);

const statusMessage = computed(() => {
  if (gameState.isWon) {
    return t("page.game.airriddle.guessedInAttempts", {
      attempts: gameState.attempts.length,
    });
  }
  if (gameState.isGameOver) {
    return t("page.game.airriddle.playersNameWas", { name: answer.value });
  }
  return t("page.game.airriddle.attemptsLeft", {
    current: gameState.attempts.length,
    max: maxAttempts,
  });
});

const emptyRows = computed(() => {
  if (gameState.isWon || gameState.isGameOver) {
    return 0;
  }
  return Math.max(0, maxAttempts - gameState.attempts.length - 1);
});

function focusHiddenInput() {
  if (isMobile.value || !canType.value) {
    return;
  }
  nextTick(() => {
    hiddenInputRef.value?.focus();
  });
}

function onPhysicalKeydown(event: KeyboardEvent) {
  if (isMobile.value || !canType.value) {
    return;
  }

  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    submitGuess();
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    removeFromGuess();
    error.value = undefined;
    return;
  }

  if (event.key.length === 1 && /^[a-zA-Z0-9 ]$/.test(event.key)) {
    event.preventDefault();
    appendToGuess(event.key);
    error.value = undefined;
  }
}

function onKeyboardLetter(letter: string) {
  appendToGuess(letter);
  error.value = undefined;
}

function onKeyboardBackspace() {
  removeFromGuess();
  error.value = undefined;
}

function onPaste(event: ClipboardEvent) {
  if (isMobile.value || !canType.value) {
    return;
  }

  const active = document.activeElement;
  const tag = active?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || active?.getAttribute("contenteditable") === "true") {
    return;
  }

  event.preventDefault();
  appendToGuess(event.clipboardData?.getData("text") ?? "");
  error.value = undefined;
}

onMounted(async () => {
  prefersReducedMotion.value = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.addEventListener("keydown", onPhysicalKeydown);
  window.addEventListener("paste", onPaste);

  try {
    const length = await getTodayAirRiddleLength();
    gameState.targetLength = length;
  } catch (loadError) {
    console.error("Failed to initialize game:", loadError);
  } finally {
    loading.value = false;
    focusHiddenInput();
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", onPhysicalKeydown);
  window.removeEventListener("paste", onPaste);
});

watch(isMobile, () => {
  focusHiddenInput();
});

watch(canType, (value) => {
  if (value) {
    focusHiddenInput();
  }
});

async function submitGuess() {
  if (!canSubmit.value || submitting.value) {
    return;
  }

  submitting.value = true;

  try {
    const results = await guessAirRiddle(
      currentGuess.value,
      gameState.attempts.length === maxAttempts - 1,
    );

    error.value = undefined;
    if (results.error) {
      error.value = results.error;
      return;
    }

    if (results.answer !== undefined) {
      answer.value = results.answer;
    }

    gameState.attempts.push({
      letters: currentGuess.value.split(""),
      results: results.result,
    });

    const isCorrect = results.result.every(
      (result: AirRiddleResultEnum) => result === AirRiddleResultEnum.CORRECT,
    );

    if (isCorrect) {
      gameState.isWon = true;
    } else if (gameState.attempts.length >= maxAttempts) {
      gameState.isGameOver = true;
    }

    clearGuess();
  } catch (submitError) {
    console.error("Failed to submit guess:", submitError);
  } finally {
    submitting.value = false;
    focusHiddenInput();
  }
}

setPageSeo({
  title: t("page.game.airriddle.seo.title"),
  description: t("page.game.airriddle.seo.description"),
});
</script>

<template>
  <section class="flex w-full flex-col gap-4">
    <UiCrossCard class="min-h-14">
      <div class="relative flex w-full items-center justify-center px-12 py-3 text-center">
        <div class="flex flex-col items-center gap-1">
          <h1 class="text-xl font-semibold tracking-tight">
            {{ t("page.game.airriddle.title") }}
          </h1>
          <p class="text-sm text-muted text-pretty">
            {{ t("page.game.airriddle.description") }}
          </p>
        </div>
        <div class="absolute right-3 top-1/2 -translate-y-1/2">
          <AirRiddleHowToPlayPopover />
        </div>
      </div>
    </UiCrossCard>

    <UiCard v-if="loading" class="mx-auto w-full max-w-md p-6">
      <div class="flex flex-col items-center gap-6">
        <div class="flex w-full flex-col gap-2">
          <USkeleton class="mx-auto h-4 w-40" />
          <div class="flex justify-center gap-1.5">
            <USkeleton v-for="index in 6" :key="index" class="size-12 sm:size-14" />
          </div>
          <div class="flex justify-center gap-1.5">
            <USkeleton v-for="index in 6" :key="`row-${index}`" class="size-12 sm:size-14" />
          </div>
        </div>
        <p class="text-sm text-muted">
          {{ t("page.game.airriddle.loadingChallenge") }}
        </p>
      </div>
    </UiCard>

    <template v-else-if="gameState.targetLength > 0">
      <UiCard class="mx-auto w-full max-w-md p-4 sm:p-6" @click="focusHiddenInput">
        <input
          v-if="!isMobile"
          ref="hiddenInputRef"
          type="text"
          class="sr-only"
          readonly
          :value="currentGuess"
          :aria-label="t('page.game.airriddle.enterGuess')"
          tabindex="-1"
        />

        <div class="flex flex-col items-center gap-6">
          <div class="w-full text-center" aria-live="polite" aria-atomic="true">
            <motion.div
              v-if="gameState.isWon"
              class="text-success"
              :initial="prefersReducedMotion ? false : { scale: 0, y: -20 }"
              :animate="prefersReducedMotion ? undefined : { scale: 1, y: 0 }"
              :transition="{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: prefersReducedMotion ? 0 : 0.3,
              }"
            >
              <p class="text-xl font-bold tracking-tight">
                {{ t("page.game.airriddle.congratulations") }}
              </p>
              <p class="text-sm text-muted tabular-nums">
                {{ statusMessage }}
              </p>
            </motion.div>
            <motion.div
              v-else-if="gameState.isGameOver"
              class="text-error"
              :initial="prefersReducedMotion ? false : { scale: 0, y: -20 }"
              :animate="prefersReducedMotion ? undefined : { scale: 1, y: 0 }"
              :transition="{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: prefersReducedMotion ? 0 : 0.3,
              }"
            >
              <p class="text-xl font-bold tracking-tight">
                {{ t("page.game.airriddle.gameOver") }}
              </p>
              <p class="text-sm text-muted">
                {{ statusMessage }}
              </p>
            </motion.div>
            <div v-else>
              <p class="text-sm font-semibold text-muted tabular-nums">
                {{ statusMessage }}
              </p>
              <p class="mt-1 text-xs text-dimmed">
                {{ t("page.game.airriddle.subtitle") }}
              </p>
              <p v-if="!isMobile" class="mt-1 text-xs text-dimmed">
                {{ t("page.game.airriddle.desktopHint") }}
              </p>
            </div>
          </div>

          <div class="flex w-full flex-col gap-1.5">
            <div
              v-for="(attempt, attemptIndex) in gameState.attempts"
              :key="attemptIndex"
              class="flex justify-center gap-1.5"
            >
              <AirRiddleTile
                v-for="(letter, letterIndex) in attempt.letters"
                :key="`${attemptIndex}-${letterIndex}`"
                :letter="letter"
                :result="attempt.results?.[letterIndex]"
                :animate="!prefersReducedMotion"
                :animation-delay="letterIndex * 0.1"
              />
            </div>

            <div
              v-if="!gameState.isWon && !gameState.isGameOver"
              class="flex justify-center gap-1.5"
            >
              <AirRiddleTile
                v-for="letterIndex in gameState.targetLength"
                :key="`current-${letterIndex}`"
                variant="current"
                :letter="currentGuess[letterIndex - 1] ?? ''"
                :animate="false"
              />
            </div>

            <div
              v-for="rowIndex in emptyRows"
              :key="`empty-${rowIndex}`"
              class="flex justify-center gap-1.5"
            >
              <AirRiddleTile
                v-for="letterIndex in gameState.targetLength"
                :key="`empty-${rowIndex}-${letterIndex}`"
                variant="empty"
                :animate="false"
              />
            </div>
          </div>

          <p v-if="error" class="w-full text-center text-sm text-error" role="alert">
            {{ t(`page.game.airriddle.${error}`) }}
          </p>

          <div v-if="!gameState.isWon && !gameState.isGameOver && isMobile" class="w-full">
            <AirRiddleKeyboard
              :disabled="!canType"
              :can-submit="canSubmit"
              :loading="submitting"
              @letter="onKeyboardLetter"
              @backspace="onKeyboardBackspace"
              @submit="submitGuess"
            />
          </div>

          <UButton
            v-else-if="!gameState.isWon && !gameState.isGameOver"
            class="w-full sm:w-auto"
            :disabled="!canSubmit"
            :loading="submitting"
            size="lg"
            color="primary"
            @click="submitGuess"
          >
            {{ submitting ? t("page.game.airriddle.submitting") : t("page.game.airriddle.guess") }}
          </UButton>
        </div>
      </UiCard>
    </template>

    <UiCard v-else class="mx-auto w-full max-w-md">
      <div class="flex flex-col items-center gap-4 px-4 py-10 text-center">
        <UIcon name="i-fluent-warning-24-regular" class="size-8 text-error" />
        <div class="space-y-1">
          <p class="text-lg font-semibold text-error">
            {{ t("page.game.airriddle.failedToLoad") }}
          </p>
          <p class="text-sm text-muted">
            {{ t("page.game.airriddle.tryAgainLater") }}
          </p>
        </div>
      </div>
    </UiCard>
  </section>
</template>
