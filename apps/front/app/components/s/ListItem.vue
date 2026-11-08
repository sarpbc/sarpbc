<script lang="ts" setup>
type ListItemSize = "compact" | "default" | "header" | "double" | "triple";

defineOptions({ inheritAttrs: false });

const { size = "default", to } = defineProps<{
  size?: ListItemSize;
  to?: string;
}>();

const attrs = useAttrs();

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
  "flex w-full row-separator",
  size === "triple" || size === "double" ? "p-2 items-stretch" : "px-2 items-center",
  listItemSizeClasses(size),
  to && "group interactive-surface",
  attrs.class,
]);

const delegatedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs;
  return rest;
});
</script>

<template>
  <NuxtLink v-if="to" :to="to" :class="itemClass" v-bind="delegatedAttrs">
    <slot />
  </NuxtLink>
  <div v-else :class="itemClass" v-bind="delegatedAttrs">
    <slot />
  </div>
</template>
