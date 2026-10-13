<script setup lang="ts">
const { open } = useCookieConsent();
const { t } = useI18n();
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UButton class="self-start" color="neutral" variant="outline" @click="open">
      {{ t("components.cookiePopup.manage") }}
    </UButton>
    <LegalDoc slug="cookie-policy" />
  </div>
</template>
