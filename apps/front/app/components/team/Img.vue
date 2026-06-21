<script lang="ts" setup>
interface Props {
  teamName: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
}

const boxClasses = {
  sm: "size-10",
  md: "size-16",
  lg: "size-24",
};

const iconClasses = {
  sm: "size-5",
  md: "size-8",
  lg: "size-10",
};

const { teamName, imageUrl, size = "md" } = defineProps<Props>();

const invertLightmode = computed(() => imageUrl !== undefined && imageUrl.includes("lightmode"));
</script>

<template>
  <div :class="[boxClasses[size], 'flex shrink-0 items-center justify-center']">
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="`${teamName} logo`"
      class="max-h-full max-w-full object-contain"
      :style="invertLightmode ? 'filter: invert(1);' : ''"
    />
    <UIcon
      v-else
      name="i-fluent-people-team-24-regular"
      :class="[iconClasses[size], 'text-muted']"
    />
  </div>
</template>
