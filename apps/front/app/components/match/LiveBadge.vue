<script lang="ts" setup>
const { t } = useI18n();
</script>

<template>
  <SbBadge color="danger" class="text-xs w-fit shrink-0 whitespace-nowrap flex items-center gap-2">
    <MatchLiveDot />
    {{ t("components.match.live") }}
  </SbBadge>
</template>
