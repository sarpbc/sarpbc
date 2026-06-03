<script setup lang="ts">
const { as = "div" } = defineProps<{
  as?: string;
}>();
</script>

<template>
  <component :is="as" class="relative box-border border border-default">
    <span class="bottom-left absolute -bottom-px -left-px size-px" />
    <span class="bottom-right absolute -bottom-px -right-px size-px" />
    <span class="top-left absolute -left-px -top-px size-px" />
    <span class="top-right absolute -right-px -top-px size-px" />
    <div class="relative z-10 flex w-full h-full">
      <slot />
    </div>
  </component>
</template>

<style scoped>
@reference "../../../assets/css/main.css";

.bottom-right {
  @apply before:absolute after:absolute;
  @apply before:top-[-4px] before:bg-inverted before:content-[''] before:w-[1px] before:h-[5px];
  @apply after:left-[-4px] after:bg-inverted after:content-[''] after:w-[5px] after:h-[1px];
}

.bottom-left {
  @apply before:absolute after:absolute;
  @apply before:top-[-4px] before:bg-inverted before:content-[''] before:w-[1px] before:h-[5px];
  @apply after:left-[0px] after:bg-inverted after:content-[''] after:w-[5px] after:h-[1px];
}

.top-right {
  @apply before:absolute after:absolute;
  @apply before:top-[0px] before:bg-inverted before:content-[''] before:w-[1px] before:h-[5px];
  @apply after:left-[-4px] after:bg-inverted after:content-[''] after:w-[5px] after:h-[1px];
}

.top-left {
  @apply before:absolute after:absolute;
  @apply before:top-[0px] before:bg-inverted before:content-[''] before:w-[1px] before:h-[5px];
  @apply after:left-[0px] after:bg-inverted after:content-[''] after:w-[5px] after:h-[1px];
}
</style>
