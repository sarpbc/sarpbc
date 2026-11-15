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
  lg: {
    box: "aspect-3/2 w-full min-w-0",
    height: 128,
    icon: "size-10",
    radius: "rounded-md",
    sizes: "(max-width: 639px) 30vw, 192px",
    width: 192,
  },
  list: {
    box: "size-7 shrink-0",
    height: 28,
    icon: "size-4",
    radius: "rounded-xs",
    sizes: "28px",
    width: 28,
  },
  row: {
    box: "h-full w-16 shrink-0 lg:w-28",
    height: 72,
    icon: "size-6",
    radius: "rounded-sm",
    sizes: "(max-width: 1023px) 64px, 112px",
    width: 112,
  },
  sm: {
    box: "h-12 w-16 shrink-0",
    height: 48,
    icon: "size-6",
    radius: "rounded-sm",
    sizes: "64px",
    width: 64,
  },
  xl: {
    box: "h-36 w-48 shrink-0 sm:h-auto sm:min-h-0 sm:w-56 md:w-64 sm:self-stretch",
    height: 192,
    icon: "size-12",
    radius: "rounded-lg",
    sizes: "(max-width: 640px) 192px, (max-width: 768px) 224px, 256px",
    width: 256,
  },
};

const { playerName, img = null, size, priority = false } = defineProps<Props>();

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
      <Icon name="i-fluent-image-24-regular" :class="[spec.icon, 'text-muted']" />
    </div>
  </div>
</template>
