<script lang="ts" setup>
import { AirRiddleResultEnum } from "~/enums/airriddle-result.enum";

const {
  letter = "",
  result,
  variant = "filled",
  revealDelay,
} = defineProps<{
  letter?: string;
  result?: AirRiddleResultEnum;
  variant?: "empty" | "current" | "filled";
  /** Flip-in delay (ms) for a row that was just submitted; omit for restored rows. */
  revealDelay?: number;
}>();

const { t } = useI18n();

const tileClass = computed(() => {
  switch (result) {
    case AirRiddleResultEnum.CORRECT:
      return "bg-success text-ink-950";
    case AirRiddleResultEnum.MISPLACED:
      return "bg-warning text-ink-950";
    case AirRiddleResultEnum.INCORRECT:
      return "bg-elevated text-highlighted";
    default:
      return variant === "current" && letter
        ? "bg-default text-highlighted"
        : "bg-default text-dimmed";
  }
});

const resultLabel = computed(() => {
  switch (result) {
    case AirRiddleResultEnum.CORRECT:
      return t("page.game.airriddle.result.correct");
    case AirRiddleResultEnum.MISPLACED:
      return t("page.game.airriddle.result.misplaced");
    case AirRiddleResultEnum.INCORRECT:
      return t("page.game.airriddle.result.incorrect");
    default:
      return null;
  }
});

const displayLetter = computed(() => letter.toUpperCase());
</script>

<template>
  <div
    class="flex aspect-square w-full min-w-0 items-center justify-center border-r border-b border-default font-mono text-base font-bold tabular-nums select-none sm:text-2xl"
    :class="[tileClass, revealDelay !== undefined && 'tile-reveal']"
    :style="revealDelay !== undefined ? { animationDelay: `${revealDelay}ms` } : undefined"
  >
    <span aria-hidden="true">{{ displayLetter }}</span>
    <span v-if="resultLabel" class="sr-only">{{ displayLetter }}, {{ resultLabel }}</span>
  </div>
</template>

<style scoped>
.tile-reveal {
  animation: tile-reveal var(--duration-normal) var(--ease-emphasized) backwards;
}

@keyframes tile-reveal {
  from {
    transform: rotateX(90deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile-reveal {
    animation-name: tile-fade;
  }

  @keyframes tile-fade {
    from {
      opacity: 0;
    }
  }
}
</style>
