<script lang="ts" setup>
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
const currentGuess = ref("");
const maxAttempts = 6;
const error = ref<undefined | string>(undefined);
const answer = ref<string | undefined>(undefined);
const inputRef = useTemplateRef("inputRef");
const prefersReducedMotion = ref(false);

const gameState = reactive<GameState>({
  targetLength: 0,
  attempts: [],
  isWon: false,
  isGameOver: false,
});

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

onMounted(async () => {
  prefersReducedMotion.value = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  try {
    const length = await getTodayAirRiddleLength();
    gameState.targetLength = length;
  } catch (loadError) {
    console.error("Failed to initialize game:", loadError);
  } finally {
    loading.value = false;
  }
});

async function submitGuess() {
  if (currentGuess.value.length !== gameState.targetLength || submitting.value) {
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

    currentGuess.value = "";
  } catch (submitError) {
    console.error("Failed to submit guess:", submitError);
  } finally {
    submitting.value = false;
    if (!gameState.isWon && !gameState.isGameOver) {
      nextTick(() => {
        inputRef.value?.inputRef?.focus();
      });
    }
  }
}

watch(currentGuess, (newValue) => {
  if (newValue.length > gameState.targetLength) {
    currentGuess.value = newValue.slice(0, gameState.targetLength);
  }
});

setPageSeo({
  title: t("page.game.airriddle.seo.title"),
  description: t("page.game.airriddle.seo.description"),
});
</script>

<template>
  <section class="flex w-full flex-col gap-4">
    <UiCrossCard class="min-h-14">
      <div class="flex w-full flex-col items-center justify-center gap-1 px-4 py-3 text-center">
        <h1 class="text-xl font-semibold tracking-tight">
          {{ t("page.game.airriddle.title") }}
        </h1>
        <p class="text-sm text-muted text-pretty">
          {{ t("page.game.airriddle.description") }}
        </p>
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
      <UiCard class="mx-auto w-full max-w-md p-4 sm:p-6">
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

          <div
            v-if="!gameState.isWon && !gameState.isGameOver"
            class="flex w-full flex-col gap-3 sm:flex-row sm:items-end"
          >
            <UFormField
              :label="t('page.game.airriddle.enterGuess')"
              name="airriddle-guess"
              class="w-full flex-1"
              :error="error ? t(`page.game.airriddle.${error}`) : undefined"
            >
              <UInput
                ref="inputRef"
                v-model="currentGuess"
                :maxlength="gameState.targetLength"
                class="w-full uppercase"
                :placeholder="t('page.game.airriddle.enterGuess')"
                :disabled="submitting"
                :aria-label="t('page.game.airriddle.enterGuess')"
                autocomplete="off"
                autocapitalize="characters"
                spellcheck="false"
                size="lg"
                @keyup.enter="submitGuess"
              />
            </UFormField>
            <UButton
              class="w-full shrink-0 sm:w-auto"
              :disabled="currentGuess.length !== gameState.targetLength || submitting"
              :loading="submitting"
              size="lg"
              color="primary"
              @click="submitGuess"
            >
              {{
                submitting ? t("page.game.airriddle.submitting") : t("page.game.airriddle.guess")
              }}
            </UButton>
          </div>
        </div>
      </UiCard>

      <UiCard class="mx-auto w-full max-w-md">
        <h2
          class="border-b border-default p-4 text-lg font-semibold tracking-tight text-highlighted"
        >
          {{ t("page.game.airriddle.howToPlay") }}
        </h2>
        <ul class="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:justify-center">
          <li class="flex items-center gap-2">
            <AirRiddleLegendTile tone="success" />
            <span class="text-sm text-muted">
              {{ t("page.game.airriddle.correctPosition") }}
            </span>
          </li>
          <li class="flex items-center gap-2">
            <AirRiddleLegendTile tone="warning" />
            <span class="text-sm text-muted">
              {{ t("page.game.airriddle.wrongPosition") }}
            </span>
          </li>
          <li class="flex items-center gap-2">
            <AirRiddleLegendTile tone="accented" />
            <span class="text-sm text-muted">
              {{ t("page.game.airriddle.notInWord") }}
            </span>
          </li>
        </ul>
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

<style scoped>
:deep(.uppercase input) {
  text-transform: uppercase !important;
}

:deep(.uppercase) {
  text-transform: uppercase;
}
</style>
