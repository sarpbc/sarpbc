<script lang="ts" setup>
const { t } = useI18n();
</script>

<template>
  <UBadge
    variant="soft"
    color="error"
    class="text-xs w-fit shrink-0 whitespace-nowrap flex items-center gap-2"
  >
    <SBadgeLiveDot />
    {{ t("components.match.live") }}
  </UBadge>
</template>
