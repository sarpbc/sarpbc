<script lang="ts" setup>
import { motion } from "motion-v";
import { AirRiddleResultEnum } from "~/enums/airriddle-result.enum";

const {
  letter = "",
  result,
  variant = "filled",
  animate = true,
  animationDelay = 0,
} = defineProps<{
  letter?: string;
  result?: AirRiddleResultEnum;
  variant?: "empty" | "current" | "filled";
  animate?: boolean;
  animationDelay?: number;
}>();

const tileClass = computed(() => {
  if (result === AirRiddleResultEnum.CORRECT) {
    return "border-success bg-success text-white";
  }
  if (result === AirRiddleResultEnum.MISPLACED) {
    return "border-warning bg-warning text-white";
  }
  if (result === AirRiddleResultEnum.INCORRECT) {
    return "border-accented bg-accented text-white";
  }
  if (variant === "current" && letter) {
    return "border-primary bg-primary/10 text-highlighted";
  }
  return "border-default bg-elevated text-dimmed";
});

const displayLetter = computed(() => letter.toUpperCase());
</script>

<template>
  <motion.div
    class="flex aspect-square w-full max-w-14 justify-self-center items-center justify-center border-2 font-mono text-[clamp(1rem,8vw,1.25rem)] font-bold tabular-nums select-none sm:text-2xl"
    :class="tileClass"
    :initial="animate ? { scale: 0, y: -50 } : false"
    :animate="animate ? { scale: 1, y: 0 } : undefined"
    :transition="
      animate
        ? {
            type: 'spring',
            stiffness: 300,
            damping: 20,
            delay: animationDelay,
          }
        : undefined
    "
    aria-hidden="true"
  >
    {{ displayLetter }}
  </motion.div>
</template>
