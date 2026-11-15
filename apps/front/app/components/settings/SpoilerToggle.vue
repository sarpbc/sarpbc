<script setup lang="ts">
const { t } = useI18n();
const { enabled, setEnabled } = useSpoilerFree();

const tooltip = computed(() =>
  enabled.value ? t("components.spoiler.disable") : t("components.spoiler.enable"),
);
</script>

<template>
  <SbTooltip :text="tooltip">
    <SbButton
      :icon="enabled ? 'i-fluent-eye-off-24-regular' : 'i-fluent-eye-24-regular'"
      variant="tertiary"
      class="selectable"
      :aria-pressed="enabled"
      :aria-label="t('components.spoiler.toggle')"
      @click="setEnabled(!enabled)"
    />
  </SbTooltip>
</template>
