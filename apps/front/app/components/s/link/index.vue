<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

defineOptions({ inheritAttrs: false });

type LinkVariant = "muted" | "inline";

const { to, variant = "muted" } = defineProps<{
  to: RouteLocationRaw;
  variant?: LinkVariant;
}>();

const attrs = useAttrs();

function variantClasses(value: LinkVariant): string {
  switch (value) {
    case "muted":
      return "text-muted hover:text-highlighted transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm cursor-default";
    case "inline":
      return "font-medium text-toned hover:underline rounded-sm transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-default";
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}

const linkClass = computed(() => [variantClasses(variant), attrs.class]);

const delegatedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs;
  return rest;
});
</script>

<template>
  <ULink :to="to" :class="linkClass" v-bind="delegatedAttrs">
    <slot />
  </ULink>
</template>
