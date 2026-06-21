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

const fallbackRadiusClasses = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
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
      :class="[
        fallbackRadiusClasses[size],
        'max-h-full max-w-full object-contain ring-1 ring-black/10 dark:ring-white/10',
      ]"
      :style="invertLightmode ? 'filter: invert(1);' : ''"
    />
    <div
      v-else
      :class="[
        boxClasses[size],
        fallbackRadiusClasses[size],
        'flex items-center justify-center bg-elevated ring-1 ring-black/10 dark:ring-white/10',
      ]"
    >
      <UIcon name="i-fluent-people-team-24-regular" :class="[iconClasses[size], 'text-muted']" />
    </div>
  </div>
</template>
