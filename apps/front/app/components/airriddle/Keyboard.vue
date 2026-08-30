<script lang="ts" setup>
import type { AirRiddleLetterStatus } from "~/utils/airRiddleLetterStatus";

const { t } = useI18n();

const {
  disabled = false,
  canSubmit = false,
  loading = false,
  letterStatuses = {},
} = defineProps<{
  disabled?: boolean;
  canSubmit?: boolean;
  loading?: boolean;
  letterStatuses?: Record<string, AirRiddleLetterStatus>;
}>();

const emit = defineEmits<{
  letter: [letter: string];
  backspace: [];
  submit: [];
}>();

const letterRows = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
] as const;

const numberRow = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

function onLetterPress(letter: string) {
  if (disabled) {
    return;
  }
  emit("letter", letter);
}

function keyClass(letter: string): string {
  const status = letterStatuses[letter.toUpperCase()];
  switch (status) {
    case "correct":
      return "bg-success text-white";
    case "misplaced":
      return "bg-warning text-white";
    case "incorrect":
      return "bg-elevated text-highlighted";
    case "unused":
    case undefined:
      return "";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-1.5 touch-manipulation">
    <div
      v-for="(row, rowIndex) in letterRows"
      :key="`row-${rowIndex}`"
      class="flex justify-center gap-1"
    >
      <UButton
        v-for="letter in row"
        :key="letter"
        type="button"
        variant="soft"
        color="neutral"
        class="inline-flex h-11 min-h-11 max-w-10 flex-1 items-center justify-center px-0 font-mono text-sm font-semibold uppercase sm:max-w-11"
        :class="keyClass(letter)"
        :disabled="disabled"
        :aria-label="letter"
        @click="onLetterPress(letter)"
      >
        {{ letter }}
      </UButton>
    </div>

    <div class="flex justify-center gap-1">
      <UButton
        v-for="digit in numberRow"
        :key="digit"
        type="button"
        variant="soft"
        color="neutral"
        class="inline-flex h-11 min-h-11 max-w-10 flex-1 items-center justify-center px-0 font-mono text-sm font-semibold tabular-nums sm:max-w-11"
        :class="keyClass(digit)"
        :disabled="disabled"
        :aria-label="digit"
        @click="onLetterPress(digit)"
      >
        {{ digit }}
      </UButton>
    </div>

    <div class="flex justify-center gap-1">
      <UButton
        type="button"
        variant="soft"
        color="neutral"
        class="inline-flex h-11 min-h-11 flex-2 items-center justify-center font-mono text-sm font-semibold uppercase"
        :disabled="disabled"
        :aria-label="t('page.game.airriddle.keyboardSpace')"
        @click="onLetterPress(' ')"
      >
        {{ t("page.game.airriddle.keyboardSpace") }}
      </UButton>
      <UButton
        type="button"
        variant="soft"
        color="neutral"
        icon="i-lucide-delete"
        class="inline-flex h-11 min-h-11 flex-1 items-center justify-center"
        :aria-label="t('page.game.airriddle.keyboardBackspace')"
        :disabled="disabled"
        @click="emit('backspace')"
      />
      <UButton
        type="button"
        color="primary"
        class="inline-flex h-11 min-h-11 flex-1 items-center justify-center font-mono text-sm font-semibold"
        :disabled="disabled || !canSubmit"
        :loading="loading"
        :aria-label="t('page.game.airriddle.keyboardEnter')"
        @click="emit('submit')"
      >
        {{ loading ? t("page.game.airriddle.submitting") : t("page.game.airriddle.keyboardEnter") }}
      </UButton>
    </div>
  </div>
</template>
