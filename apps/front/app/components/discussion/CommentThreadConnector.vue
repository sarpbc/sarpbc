<script lang="ts" setup>
const { showFullConnector = false } = defineProps<{
  showFullConnector?: boolean;
}>();
</script>

<template>
  <div class="flex flex-col h-full w-fit relative">
    <div class="w-4 h-[49px] border-b border-default" :class="{ 'border-l': !showFullConnector }" />
    <div v-if="showFullConnector" class="w-4 h-full absolute border-l border-default" />
  </div>
</template>
