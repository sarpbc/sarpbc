<script lang="ts" setup>
const { tone } = defineProps<{
  tone: "success" | "warning" | "accented";
}>();

const toneClass = computed(() => {
  switch (tone) {
    case "success":
      return "border-success bg-success";
    case "warning":
      return "border-warning bg-warning";
    case "accented":
      return "border-accented bg-accented";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
});
</script>

<template>
  <div
    class="flex size-7 items-center justify-center border font-mono text-sm font-bold text-white"
    :class="toneClass"
    aria-hidden="true"
  >
    A
  </div>
</template>
