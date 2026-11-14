<script lang="ts" setup>
interface Props {
  playerName: string;
  img?: string | null;
  /** `row` fills the height of a stretched parent row (e.g. an `SListItem` double row). */
  size: "list" | "sm" | "row" | "lg" | "xl";
  /** Use for above-the-fold / LCP images */
  priority?: boolean;
}

const SIZES = {
  list: {
    box: "size-7 shrink-0",
    width: 28,
    height: 28,
    sizes: "28px",
    icon: "size-4",
    radius: "rounded-xs",
  },
  sm: {
    box: "h-12 w-16 shrink-0",
    width: 64,
    height: 48,
    sizes: "64px",
    icon: "size-6",
    radius: "rounded-sm",
  },
  row: {
    box: "h-full w-16 shrink-0 lg:w-28",
    width: 112,
    height: 72,
    sizes: "(max-width: 1023px) 64px, 112px",
    icon: "size-6",
    radius: "rounded-sm",
  },
  lg: {
    box: "aspect-3/2 w-full min-w-0",
    width: 192,
    height: 128,
    sizes: "(max-width: 639px) 30vw, 192px",
    icon: "size-10",
    radius: "rounded-md",
  },
  xl: {
    box: "h-36 w-48 shrink-0 sm:h-auto sm:min-h-0 sm:w-56 md:w-64 sm:self-stretch",
    width: 256,
    height: 192,
    sizes: "(max-width: 640px) 192px, (max-width: 768px) 224px, 256px",
    icon: "size-12",
    radius: "rounded-lg",
  },
};

const { playerName, img, size, priority = false } = defineProps<Props>();

const spec = computed(() => SIZES[size]);
const failed = ref(false);

watch(
  () => img,
  () => {
    failed.value = false;
  },
);
</script>

<template>
  <div :class="[spec.box, 'flex items-center justify-center overflow-hidden']">
    <NuxtImg
      v-if="img && !failed"
      :src="img"
      :alt="playerName"
      :width="spec.width"
      :height="spec.height"
      :sizes="spec.sizes"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : undefined"
      :class="[spec.radius, 'h-full w-full object-cover']"
      @error="failed = true"
    />
    <div v-else :class="[spec.box, spec.radius, 'flex items-center justify-center bg-muted']">
      <UIcon name="i-fluent-image-24-regular" :class="[spec.icon, 'text-muted']" />
    </div>
  </div>
</template>
