<script setup lang="ts" generic="T extends string">
export interface TextToggleOption<V extends string> {
  value: V;
  label: string;
  ariaLabel?: string;
}

const { options, ariaLabel } = defineProps<{
  options: TextToggleOption<T>[];
  ariaLabel: string;
}>();

const model = defineModel<T>({ required: true });
</script>

<template>
  <div class="flex items-center" role="radiogroup" :aria-label="ariaLabel">
    <template v-for="(option, index) in options" :key="option.value">
      <span v-if="index > 0" class="text-xs text-dimmed" aria-hidden="true">/</span>
      <button
        type="button"
        role="radio"
        :aria-checked="model === option.value"
        :aria-label="option.ariaLabel"
        class="px-1.5 py-1 text-xs font-medium tracking-wider"
        :class="model === option.value ? 'text-highlighted' : 'text-muted hover:text-highlighted'"
        @click="model = option.value"
      >
        {{ option.label }}
      </button>
    </template>
  </div>
</template>
