<script lang="ts" setup>
import { AirRiddleResultEnum } from "~/enums/airriddle-result.enum";
import { motion } from "motion-v";

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

const gameState = reactive<GameState>({
  targetLength: 0,
  attempts: [],
  isWon: false,
  isGameOver: false,
});

onMounted(async () => {
  try {
    const length = await getTodayAirRiddleLength();
    gameState.targetLength = length;
    loading.value = false;
  } catch (error) {
    console.error("Failed to initialize game:", error);
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
  } catch (error) {
    console.error("Failed to submit guess:", error);
  } finally {
    submitting.value = false;
    if (!gameState.isWon && !gameState.isGameOver) {
      nextTick(() => {
        inputRef.value?.inputRef?.focus();
      });
    }
  }
}

function getLetterClasses(result?: AirRiddleResultEnum): string {
  const baseClasses = "";

  if (!result) return baseClasses;

  switch (result) {
    case AirRiddleResultEnum.CORRECT:
      return `${baseClasses} bg-success border-success text-white`;
    case AirRiddleResultEnum.MISPLACED:
      return `${baseClasses} bg-warning border-warning text-white`;
    case AirRiddleResultEnum.INCORRECT:
      return `${baseClasses} bg-accented border-accented text-white`;
    default:
      return baseClasses;
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
  <section class="w-full flex flex-col gap-4">
    <UiCrossCard class="h-14">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-xl font-semibold">
          {{ t("page.game.airriddle.title") }}
        </h1>
      </div>
    </UiCrossCard>

    <div v-if="loading" class="flex flex-row justify-center items-center border border-default p-2">
      <div class="flex flex-col items-center gap-4">
        <UIcon name="i-ph-spinner-bold" class="size-8 animate-spin" />
        <p class="text-lg text-muted">
          {{ t("page.game.airriddle.loadingChallenge") }}
        </p>
      </div>
    </div>

    <div v-else-if="gameState.targetLength > 0" class="flex flex-col gap-4">
      <div class="flex flex-col justify-center items-center border border-default p-4">
        <div class="text-center">
          <motion.div
            v-if="gameState.isWon"
            class="text-success"
            :initial="{ scale: 0, y: -20 }"
            :animate="{ scale: 1, y: 0 }"
            :transition="{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.3,
            }"
          >
            <p class="text-xl font-bold">
              {{ t("page.game.airriddle.congratulations") }}
            </p>
            <p class="text-lg">
              {{
                t("page.game.airriddle.guessedInAttempts", {
                  attempts: gameState.attempts.length,
                })
              }}
            </p>
          </motion.div>
          <motion.div
            v-else-if="gameState.isGameOver"
            class="text-error"
            :initial="{ scale: 0, y: -20 }"
            :animate="{ scale: 1, y: 0 }"
            :transition="{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.3,
            }"
          >
            <p class="text-xl font-bold">
              {{ t("page.game.airriddle.gameOver") }}
            </p>
            <p class="text-lg">
              {{ t("page.game.airriddle.playersNameWas", { name: answer }) }}
            </p>
          </motion.div>
          <div v-else class="text-muted">
            <p class="text-lg font-semibold">
              {{
                t("page.game.airriddle.attemptsLeft", {
                  current: gameState.attempts.length,
                  max: maxAttempts,
                })
              }}
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-2 p-4">
          <div
            v-for="(attempt, attemptIndex) in gameState.attempts"
            :key="attemptIndex"
            class="flex justify-center gap-1"
          >
            <motion.div
              v-for="(letter, letterIndex) in attempt.letters"
              :key="letterIndex"
              class="w-12 h-12 border-2 flex items-center justify-center text-xl font-bold"
              :class="getLetterClasses(attempt.results?.[letterIndex])"
              :initial="{ scale: 0, y: -50 }"
              :animate="{ scale: 1, y: 0 }"
              :transition="{
                type: 'spring',
                stiffness: 300,
                damping: 20,
                delay: letterIndex * 0.1,
              }"
            >
              {{ letter.toUpperCase() }}
            </motion.div>
          </div>

          <div v-if="!gameState.isWon && !gameState.isGameOver" class="flex justify-center gap-1">
            <motion.div
              v-for="letterIndex in gameState.targetLength"
              :key="letterIndex"
              class="w-12 h-12 border border-primary bg-primary/20 flex items-center justify-center text-xl font-bold"
              :initial="{ scale: 0.9, opacity: 0.7 }"
              :animate="{
                scale: currentGuess[letterIndex - 1] ? 1.05 : 1,
                opacity: currentGuess[letterIndex - 1] ? 1 : 0.7,
              }"
              :transition="{
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }"
            >
              {{ currentGuess[letterIndex - 1]?.toUpperCase() || "" }}
            </motion.div>
          </div>
        </div>

        <div
          v-if="!gameState.isWon && !gameState.isGameOver"
          class="w-full max-w-2xl flex flex-col sm:flex-row gap-4 items-center"
        >
          <UInput
            ref="inputRef"
            v-model="currentGuess"
            :maxlength="gameState.targetLength"
            class="flex-1 text-center font-semibold uppercase"
            :placeholder="t('page.game.airriddle.enterGuess')"
            :disabled="submitting"
            size="lg"
            @keyup.enter="submitGuess"
          />
          <UButton
            :disabled="currentGuess.length !== gameState.targetLength || submitting"
            :loading="submitting"
            size="lg"
            color="primary"
            @click="submitGuess"
          >
            {{ submitting ? t("page.game.airriddle.submitting") : t("page.game.airriddle.guess") }}
          </UButton>
        </div>
        <div v-if="error" class="text-error">
          {{ t(`page.game.airriddle.${error}`) }}
        </div>
      </div>

      <div class="flex flex-col justify-center items-center border border-default">
        <h3 class="w-full border-b border-default text-lg font-semibold text-highlighted p-4">
          {{ t("page.game.airriddle.howToPlay") }}
        </h3>
        <div class="flex flex-wrap justify-center gap-4 p-4">
          <div class="flex items-center gap-2">
            <div
              class="w-6 h-6 bg-success flex items-center justify-center text-white font-bold text-sm"
            >
              A
            </div>
            <span class="text-sm text-muted">
              {{ t("page.game.airriddle.correctPosition") }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <div
              class="w-6 h-6 bg-warning flex items-center justify-center text-white font-bold text-sm"
            >
              A
            </div>
            <span class="text-sm text-muted">
              {{ t("page.game.airriddle.wrongPosition") }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <div
              class="w-6 h-6 bg-accented flex items-center justify-center text-white font-bold text-sm"
            >
              A
            </div>
            <span class="text-sm text-muted">
              {{ t("page.game.airriddle.notInWord") }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col justify-center items-center border border-default">
      <div class="flex flex-col text-center items-center gap-4">
        <UIcon name="i-fluent-warning-24-regular" class="size-8 text-error" />
        <p class="text-lg text-error dark:text-error font-semibold">
          {{ t("page.game.airriddle.failedToLoad") }}
        </p>
        <p class="text-muted">
          {{ t("page.game.airriddle.tryAgainLater") }}
        </p>
      </div>
    </div>
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
