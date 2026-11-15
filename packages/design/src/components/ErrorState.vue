<script setup lang="ts">
import { useDesignAdapters } from "../adapters.ts";

import Button from "./Button.vue";
import EmptyState from "./EmptyState.vue";

const { message } = defineProps<{ message: string }>();

const emit = defineEmits<{ retry: [] }>();

const adapters = useDesignAdapters();
</script>

<template>
  <EmptyState role="alert" icon="i-fluent-warning-24-regular" :title="message">
    <Button variant="secondary" :label="adapters.translate('retry')" @click="emit('retry')" />
  </EmptyState>
</template>
