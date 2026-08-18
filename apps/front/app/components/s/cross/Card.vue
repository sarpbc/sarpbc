<script setup lang="ts">
const { as = "div" } = defineProps<{
  as?: string;
}>();
</script>

<template>
  <component :is="as" class="relative box-border flex border border-default">
    <span class="bottom-left absolute -bottom-px -left-px size-px" />
    <span class="bottom-right absolute -bottom-px -right-px size-px" />
    <span class="top-left absolute -left-px -top-px size-px" />
    <span class="top-right absolute -right-px -top-px size-px" />
    <div class="relative z-10 flex h-full min-h-0 w-full flex-1 items-center">
      <slot />
    </div>
  </component>
</template>

<style scoped>
@reference "../../../assets/css/main.css";

.bottom-right,
.bottom-left,
.top-right,
.top-left {
  --cross: var(--spacing-cross);
  --hair: var(--spacing-px);
}

.bottom-right::before,
.bottom-left::before,
.top-right::before,
.top-left::before,
.bottom-right::after,
.bottom-left::after,
.top-right::after,
.top-left::after {
  @apply absolute bg-inverted content-[''];
}

.bottom-right::before,
.bottom-left::before {
  top: calc(var(--cross) * -1);
  width: var(--hair);
  height: calc(var(--cross) + var(--hair));
}

.bottom-right::after,
.top-right::after {
  left: calc(var(--cross) * -1);
  width: calc(var(--cross) + var(--hair));
  height: var(--hair);
}

.bottom-left::after,
.top-left::after {
  left: 0;
  width: calc(var(--cross) + var(--hair));
  height: var(--hair);
}

.top-right::before,
.top-left::before {
  top: 0;
  width: var(--hair);
  height: calc(var(--cross) + var(--hair));
}
</style>
