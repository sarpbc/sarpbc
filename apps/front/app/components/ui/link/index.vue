<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

defineOptions({ inheritAttrs: false });

type LinkVariant = "muted" | "inline";
type LinkSound = "hover" | "none";

const {
  to,
  variant = "muted",
  sound = "hover",
} = defineProps<{
  to: RouteLocationRaw;
  variant?: LinkVariant;
  sound?: LinkSound;
}>();

const attrs = useAttrs();
const { attrs: cuelumeAttrs } = useCuelume();

function variantClasses(value: LinkVariant): string {
  switch (value) {
    case "muted":
      return "text-muted hover:text-highlighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm";
    case "inline":
      return "font-medium text-toned hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}

const linkClass = computed(() => [variantClasses(variant), attrs.class]);

const soundAttrs = computed(() => (sound === "hover" ? cuelumeAttrs.hoverTick : {}));

const delegatedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs;
  return { ...soundAttrs.value, ...rest };
});
</script>

<template>
  <ULink :to="to" :class="linkClass" v-bind="delegatedAttrs">
    <slot />
  </ULink>
</template>
