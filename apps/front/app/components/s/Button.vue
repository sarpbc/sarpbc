<script setup lang="ts">
defineOptions({ inheritAttrs: false });

type ButtonSound = "press" | "toggle" | "none";

const { sound = "press", static: isStatic = false } = defineProps<{
  sound?: ButtonSound;
  /** Disable press scale (e.g. dense icon grids). */
  static?: boolean;
}>();

const attrs = useAttrs();
const { attrs: cuelumeAttrs, pressClass, playCue } = useCuelume();

function soundAttrs(value: ButtonSound): Record<string, string> {
  switch (value) {
    case "press":
      return cuelumeAttrs.pressRelease;
    case "toggle":
      return cuelumeAttrs.toggle;
    case "none":
      return {};
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}

const delegatedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs;
  return {
    ...soundAttrs(sound),
    ...rest,
    class: [!isStatic && sound === "press" ? pressClass : undefined, attrs.class],
  };
});

watch(
  () => attrs.loading,
  (isLoading, wasLoading) => {
    if (isLoading && !wasLoading) {
      playCue("loading");
    }
  },
);
</script>

<template>
  <UButton v-bind="delegatedAttrs">
    <slot />
  </UButton>
</template>
