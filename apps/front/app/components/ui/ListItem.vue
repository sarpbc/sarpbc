<script lang="ts" setup>
type ListItemSize = "compact" | "default" | "header" | "double" | "triple";

defineOptions({ inheritAttrs: false });

const {
  size = "default",
  to,
  divider = false,
} = defineProps<{
  size?: ListItemSize;
  to?: string;
  /** Bottom border. Use on every row including last when the parent is `flushBottom`. */
  divider?: boolean;
}>();

const attrs = useAttrs();
const { attrs: cuelumeAttrs } = useCuelume();

function listItemSizeClasses(value: ListItemSize): string {
  switch (value) {
    case "compact":
      return "h-row-compact min-h-row-compact";
    case "default":
      return "h-row min-h-row";
    case "header":
      return "h-row-header min-h-row-header";
    case "double":
      return "h-row-double min-h-row-double";
    case "triple":
      return "h-row-triple min-h-row-triple";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

const itemClass = computed(() => [
  "flex w-full px-2",
  size === "triple" ? "items-stretch" : "items-center",
  listItemSizeClasses(size),
  divider && "border-b border-default",
  to &&
    "hover:bg-elevated/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
  attrs.class,
]);

const delegatedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs;
  return rest;
});
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :class="itemClass"
    v-bind="{ ...cuelumeAttrs.hoverTick, ...delegatedAttrs }"
  >
    <slot />
  </NuxtLink>
  <div v-else :class="itemClass" v-bind="delegatedAttrs">
    <slot />
  </div>
</template>
