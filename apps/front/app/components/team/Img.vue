<script lang="ts" setup>
interface Props {
  teamName: string;
  imageUrl?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

const boxClasses = {
  xs: "size-4",
  sm: "size-10",
  md: "size-16",
  lg: "size-24",
};

const iconClasses = {
  xs: "size-2.5",
  sm: "size-5",
  md: "size-8",
  lg: "size-10",
};

const fallbackRadiusClasses = {
  xs: "rounded-xs",
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
      :class="[fallbackRadiusClasses[size], 'max-h-full max-w-full object-contain']"
      :style="invertLightmode ? 'filter: invert(1);' : ''"
    />
    <div
      v-else
      :class="[
        boxClasses[size],
        fallbackRadiusClasses[size],
        'flex items-center justify-center bg-elevated',
      ]"
    >
      <UIcon name="i-fluent-people-team-24-regular" :class="[iconClasses[size], 'text-muted']" />
    </div>
  </div>
</template>
