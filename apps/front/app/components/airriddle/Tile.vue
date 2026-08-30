<script lang="ts" setup>
import { AirRiddleResultEnum } from "~/enums/airriddle-result.enum";

const {
  letter = "",
  result,
  variant = "filled",
} = defineProps<{
  letter?: string;
  result?: AirRiddleResultEnum;
  variant?: "empty" | "current" | "filled";
}>();

const tileClass = computed(() => {
  if (result === AirRiddleResultEnum.CORRECT) {
    return "bg-success text-white";
  }
  if (result === AirRiddleResultEnum.MISPLACED) {
    return "bg-warning text-white";
  }
  if (result === AirRiddleResultEnum.INCORRECT) {
    return "bg-elevated text-highlighted";
  }
  if (variant === "current" && letter) {
    return "bg-default text-highlighted";
  }
  return "bg-default text-dimmed";
});

const displayLetter = computed(() => letter.toUpperCase());
</script>

<template>
  <div
    class="flex size-11 items-center justify-center border-r border-b border-default font-mono text-lg font-bold tabular-nums select-none sm:size-14 sm:text-2xl"
    :class="tileClass"
    aria-hidden="true"
  >
    {{ displayLetter }}
  </div>
</template>
