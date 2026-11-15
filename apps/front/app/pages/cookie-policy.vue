<script setup lang="ts">
const { open } = useCookieConsent();
const { t } = useI18n();
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SButton class="self-start" variant="secondary" @click="open">
      {{ t("components.cookiePopup.manage") }}
    </SButton>
    <LegalDoc slug="cookie-policy" />
  </div>
</template>
