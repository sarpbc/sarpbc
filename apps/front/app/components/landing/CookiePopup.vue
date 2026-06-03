<script setup lang="ts">
import { onMounted, watchEffect } from "vue";
import { motion, AnimatePresence } from "motion-v";

const { t } = useI18n();
const { visible, open, close, hasChoice, setChoice } = useCookieConsent();
const { $reloadVisitorsScript } = useNuxtApp();

onMounted(() => {
  if (!hasChoice()) open();
});

watchEffect(() => {
  if (!import.meta.client) return;
});

const acceptCookies = () => {
  setChoice("accepted");
  close();

  // Reload visitors.now script with persist mode enabled
  if (typeof $reloadVisitorsScript === "function") {
    $reloadVisitorsScript();
  }
};

const rejectCookies = () => {
  setChoice("rejected");
  close();
};
</script>

<template>
  <AnimatePresence>
    <motion.div
      v-if="visible"
      key="cookie-popup"
      :initial="{ y: 100 }"
      :animate="{
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 25 },
      }"
      :exit="{ y: 200 }"
      class="fixed bottom-4 z-50 max-w-sm w-full left-1/2 transform -translate-x-1/2 md:right-4 md:left-auto md:transform-none"
    >
      <UiCard variant="subtle" class="bg-default p-2">
        <p class="text-toned text-md mb-4">
          {{ t("components.cookiePopup.description") }}
        </p>

        <div class="flex justify-start space-x-2">
          <UButton color="primary" class="cursor-pointer" @click="acceptCookies">
            {{ t("common.accept") }}
          </UButton>
          <UButton variant="ghost" color="neutral" class="cursor-pointer" @click="rejectCookies">
            {{ t("common.decline") }}
          </UButton>
        </div>
      </UiCard>
    </motion.div>
  </AnimatePresence>
</template>
