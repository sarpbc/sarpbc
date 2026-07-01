<script lang="ts" setup>
const { t } = useI18n();

const {
  disabled = false,
  canSubmit = false,
  loading = false,
} = defineProps<{
  disabled?: boolean;
  canSubmit?: boolean;
  loading?: boolean;
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
        variant="soft"
        color="neutral"
        class="h-11 min-h-11 flex-1 max-w-10 px-0 font-mono text-sm font-semibold uppercase sm:max-w-11"
        :disabled="disabled"
        @click="onLetterPress(letter)"
      >
        {{ letter }}
      </UButton>
    </div>

    <div class="flex justify-center gap-1">
      <UButton
        v-for="digit in numberRow"
        :key="digit"
        variant="soft"
        color="neutral"
        class="h-11 min-h-11 flex-1 max-w-10 px-0 font-mono text-sm font-semibold tabular-nums sm:max-w-11"
        :disabled="disabled"
        @click="onLetterPress(digit)"
      >
        {{ digit }}
      </UButton>
    </div>

    <div class="flex justify-center gap-1">
      <UButton
        variant="soft"
        color="neutral"
        class="h-11 min-h-11 flex-[2] font-mono text-sm font-semibold uppercase"
        :disabled="disabled"
        @click="onLetterPress(' ')"
      >
        {{ t("page.game.airriddle.keyboardSpace") }}
      </UButton>
      <UButton
        variant="soft"
        color="neutral"
        icon="i-lucide-delete"
        class="h-11 min-h-11 flex-1"
        :aria-label="t('page.game.airriddle.keyboardBackspace')"
        :disabled="disabled"
        @click="emit('backspace')"
      />
    </div>

    <UButton
      class="h-11 min-h-11 w-full"
      color="primary"
      :disabled="disabled || !canSubmit"
      :loading="loading"
      @click="emit('submit')"
    >
      {{ loading ? t("page.game.airriddle.submitting") : t("page.game.airriddle.guess") }}
    </UButton>
  </div>
</template>
