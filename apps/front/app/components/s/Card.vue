<script lang="ts" setup>
type CardSize = "s" | "m" | "l";

const {
  flushBottom = false,
  flushTop = false,
  flushX = false,
  size,
} = defineProps<{
  /** Omit bottom border — last list row’s `border-b` closes the box. */
  flushBottom?: boolean;
  /** Omit top border — stack under a rail caption without adding a grid pixel. */
  flushTop?: boolean;
  /** Omit left and right borders. */
  flushX?: boolean;
  /** Min height on the hub row grid (`n × row-double + 1px`). Grows by `row-double` so both side rails stay aligned. */
  size?: CardSize;
}>();

function cardSizeClasses(value: CardSize): string {
  switch (value) {
    case "s":
      return "min-h-card-s h-row-snap";
    case "m":
      return "min-h-card-m h-row-snap";
    case "l":
      return "min-h-card-l h-row-snap";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

const borderClass = computed(() => {
  if (!flushX && !flushTop && !flushBottom) {
    return "border";
  }
  return [!flushX && "border-x", !flushTop && "border-t", !flushBottom && "border-b"].filter(
    Boolean,
  );
});
</script>

<template>
  <div class="box-border border-default" :class="[borderClass, size && cardSizeClasses(size)]">
    <slot />
  </div>
</template>
