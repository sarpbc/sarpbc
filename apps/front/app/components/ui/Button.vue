<script setup lang="ts">
defineOptions({ inheritAttrs: false });

type ButtonSound = "press" | "toggle" | "none";

const { sound = "press" } = defineProps<{
  sound?: ButtonSound;
}>();

const attrs = useAttrs();
const { attrs: cuelumeAttrs } = useCuelume();

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
  return { ...soundAttrs(sound), ...rest, class: attrs.class };
});
</script>

<template>
  <UButton v-bind="delegatedAttrs">
    <slot />
  </UButton>
</template>
