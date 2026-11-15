<script setup lang="ts">
const { open } = useCookieConsent();
const { t } = useI18n();
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SbButton class="self-start" variant="secondary" @click="open">
      {{ t("components.cookiePopup.manage") }}
    </SbButton>
    <LegalDoc slug="cookie-policy" />
  </div>
</template>
