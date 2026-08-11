<script lang="ts" setup>
const { showFullConnector = false } = defineProps<{
  /** When true, the vertical spine continues past this branch to later siblings. */
  showFullConnector?: boolean;
}>();
</script>

<template>
  <div class="relative w-4 shrink-0 self-stretch" aria-hidden="true">
    <div v-if="showFullConnector" class="absolute inset-y-0 left-0 border-l border-default" />
    <div
      class="absolute left-0 top-0 h-10 w-full border-b border-default"
      :class="{ 'border-l': !showFullConnector }"
    />
  </div>
</template>
