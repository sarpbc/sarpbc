<script lang="ts" setup>
import { useMediaQuery } from "@vueuse/core";
import AirRiddleHowToPlayPopover from "~/components/airriddle/HowToPlayPopover.vue";
import AirRiddleKeyboard from "~/components/airriddle/Keyboard.vue";
import AirRiddleTile from "~/components/airriddle/Tile.vue";
import { AirRiddleResultEnum } from "~/enums/airriddle-result.enum";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const posthog = usePostHog();

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

const tileSize = computed(() => (isMobile.value ? "2.75rem" : "3.5rem"));

const tileGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(targetLength.value, 1)}, ${tileSize.value})`,
}));

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

function persistGameState() {
  if (gameState.targetLength <= 0) {
    return;
  }

  saveAirRiddleStoredState({
    targetLength: gameState.targetLength,
    attempts: gameState.attempts,
    isWon: gameState.isWon,
    isGameOver: gameState.isGameOver,
    answer: answer.value,
  });
}

function restoreGameState(length: number) {
  const stored = loadAirRiddleStoredState();
  if (!stored || stored.targetLength !== length) {
    return;
  }

  gameState.attempts = stored.attempts;
  gameState.isWon = stored.isWon;
  gameState.isGameOver = stored.isGameOver;
  answer.value = stored.answer;
}

onMounted(async () => {
  window.addEventListener("keydown", onPhysicalKeydown);
  window.addEventListener("paste", onPaste);

  try {
    const length = await getTodayAirRiddleLength();
    gameState.targetLength = length;
    if (length > 0) {
      restoreGameState(length);
    }
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

    posthog?.capture("airriddle_guess_submitted", {
      attempt_number: gameState.attempts.length,
    });

    if (isCorrect) {
      gameState.isWon = true;
      posthog?.capture("airriddle_game_won", { attempts: gameState.attempts.length });
    } else if (gameState.attempts.length >= maxAttempts) {
      gameState.isGameOver = true;
      posthog?.capture("airriddle_game_lost", { attempts: gameState.attempts.length });
    }

    clearGuess();
    persistGameState();
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
    <UiCrossCard class="min-h-row-header">
      <div class="flex w-full items-center justify-center py-3 text-center">
        <h1 class="text-xl font-semibold tracking-tight">
          {{ t("page.game.airriddle.title") }}
        </h1>
      </div>
    </UiCrossCard>

    <UiCard v-if="loading" class="relative w-full p-6">
      <div class="absolute right-3 top-3" @click.stop>
        <AirRiddleHowToPlayPopover />
      </div>
      <div class="flex flex-col items-center gap-6">
        <USkeleton class="h-4 w-40" />
        <div class="inline-flex flex-col border-l border-t border-default">
          <div class="inline-grid grid-cols-6 gap-0">
            <USkeleton
              v-for="index in 6"
              :key="index"
              class="size-11 rounded-none border-r border-b border-default sm:size-14"
            />
          </div>
          <div class="inline-grid grid-cols-6 gap-0">
            <USkeleton
              v-for="index in 6"
              :key="`row-${index}`"
              class="size-11 rounded-none border-r border-b border-default sm:size-14"
            />
          </div>
        </div>
        <p class="text-sm text-muted">
          {{ t("page.game.airriddle.loadingChallenge") }}
        </p>
      </div>
    </UiCard>

    <template v-else-if="gameState.targetLength > 0">
      <UiCard class="relative w-full p-4 sm:p-6" @click="focusHiddenInput">
        <div class="absolute right-3 top-3" @click.stop>
          <AirRiddleHowToPlayPopover />
        </div>
        <input
          v-if="!isMobile"
          ref="hiddenInputRef"
          type="text"
          class="sr-only outline-none focus:outline-none"
          readonly
          :value="currentGuess"
          :aria-label="t('page.game.airriddle.enterGuess')"
          tabindex="-1"
        />

        <div class="flex flex-col items-center gap-6">
          <div class="w-full text-center" aria-live="polite" aria-atomic="true">
            <div v-if="gameState.isWon" class="text-success">
              <p class="text-xl font-bold tracking-tight">
                {{ t("page.game.airriddle.congratulations") }}
              </p>
              <p class="text-sm text-muted tabular-nums">
                {{ statusMessage }}
              </p>
            </div>
            <div v-else-if="gameState.isGameOver" class="text-error">
              <p class="text-xl font-bold tracking-tight">
                {{ t("page.game.airriddle.gameOver") }}
              </p>
              <p class="text-sm text-muted">
                {{ statusMessage }}
              </p>
            </div>
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

          <div class="flex w-full justify-center">
            <div class="inline-flex flex-col border-l border-t border-default">
              <div
                v-for="(attempt, attemptIndex) in gameState.attempts"
                :key="attemptIndex"
                class="inline-grid gap-0"
                :style="tileGridStyle"
              >
                <AirRiddleTile
                  v-for="(letter, letterIndex) in attempt.letters"
                  :key="`${attemptIndex}-${letterIndex}`"
                  :letter="letter"
                  :result="attempt.results?.[letterIndex]"
                />
              </div>

              <div
                v-if="!gameState.isWon && !gameState.isGameOver"
                class="inline-grid gap-0"
                :style="tileGridStyle"
              >
                <AirRiddleTile
                  v-for="letterIndex in gameState.targetLength"
                  :key="`current-${letterIndex}`"
                  variant="current"
                  :letter="currentGuess[letterIndex - 1] ?? ''"
                />
              </div>

              <div
                v-for="rowIndex in emptyRows"
                :key="`empty-${rowIndex}`"
                class="inline-grid gap-0"
                :style="tileGridStyle"
              >
                <AirRiddleTile
                  v-for="letterIndex in gameState.targetLength"
                  :key="`empty-${rowIndex}-${letterIndex}`"
                  variant="empty"
                />
              </div>
            </div>
          </div>

          <p v-if="error" class="w-full text-center text-sm text-error" role="alert">
            {{ t(`page.game.airriddle.${error}`) }}
          </p>

          <div v-if="isMobile && !gameState.isWon && !gameState.isGameOver" class="w-full">
            <AirRiddleKeyboard
              :disabled="!canType"
              :can-submit="canSubmit"
              :loading="submitting"
              @letter="onKeyboardLetter"
              @backspace="onKeyboardBackspace"
              @submit="submitGuess"
            />
          </div>
        </div>
      </UiCard>
    </template>

    <UiCard v-else class="relative w-full">
      <div class="absolute right-3 top-3" @click.stop>
        <AirRiddleHowToPlayPopover />
      </div>
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
