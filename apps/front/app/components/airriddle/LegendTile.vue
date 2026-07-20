<script lang="ts" setup>
const { tone } = defineProps<{
  tone: "success" | "warning" | "accented";
}>();

const toneClass = computed(() => {
  switch (tone) {
    case "success":
      return "bg-success text-white";
    case "warning":
      return "bg-warning text-white";
    case "accented":
      return "bg-default text-highlighted";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
});
</script>

<template>
  <div
    class="flex size-7 items-center justify-center border border-default font-mono text-sm font-bold"
    :class="toneClass"
    aria-hidden="true"
  >
    A
  </div>
</template>
