<script lang="ts" setup>
const { t } = useI18n();

const props = defineProps<{
  search: string;
}>();

const emit = defineEmits(["update:search", "focus", "blur"]);

const inputRef = useTemplateRef("inputRef");

const updateSearch = (payload: string | null): void => {
  emit("update:search", payload);
};

function handleFocus(): void {
  emit("focus");
}

function handleBlur(): void {
  emit("blur");
}

defineExpose({
  blur: () => inputRef.value?.inputRef?.blur(),
});
</script>

<template>
  <UInput
    ref="inputRef"
    :placeholder="t('components.input.search')"
    :model-value="props.search"
    icon="i-fluent-search-24-regular"
    variant="soft"
    color="neutral"
    :ui="{
      base: 'border border-transparent focus:border-accented',
    }"
    @update:model-value="updateSearch"
    @focus="handleFocus"
    @blur="handleBlur"
  />
</template>
