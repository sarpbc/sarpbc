<script lang="ts" setup>
const { t } = useI18n();

const { search } = defineProps<{
  search: string;
}>();

const emit = defineEmits<{
  "update:search": [payload: string | null];
  focus: [];
  blur: [];
}>();

const inputRef = useTemplateRef("inputRef");

const updateSearch = (payload: string | null): void => {
  emit("update:search", payload);
};

const handleFocus = (): void => {
  emit("focus");
};

const handleBlur = (): void => {
  emit("blur");
};

defineExpose({
  blur: () => inputRef.value?.inputRef?.blur(),
});
</script>

<template>
  <UInput
    ref="inputRef"
    :placeholder="t('components.input.search')"
    :aria-label="t('components.input.search')"
    :model-value="search"
    icon="i-fluent-search-24-regular"
    variant="soft"
    color="neutral"
    :ui="{
      base: 'border border-transparent bg-default',
    }"
    @update:model-value="updateSearch"
    @focus="handleFocus"
    @blur="handleBlur"
  />
</template>
