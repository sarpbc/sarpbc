<script lang="ts" setup>
type CardSize = "s" | "m" | "l";

const { size = null } = defineProps<{
  /** Min height on the hub row grid (`n × row-double`). Grows by `row-double` so both side rails stay aligned. */
  size?: CardSize | null;
}>();

const cardSizeClasses = (value: CardSize): string => {
  switch (value) {
    case "s": {
      return "min-h-card-s h-row-snap";
    }

    case "m": {
      return "min-h-card-m h-row-snap";
    }

    case "l": {
      return "min-h-card-l h-row-snap";
    }

    default: {
      const _exhaustive: never = value;

      return _exhaustive;
    }
  }
};
</script>

<template>
  <div :class="['frame', size && cardSizeClasses(size)]">
    <slot />
  </div>
</template>
