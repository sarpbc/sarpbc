<script setup lang="ts">
const { t } = useI18n();
const { visible, close, setChoice } = useCookieConsent();
const { identifyUser, clearIdentity } = usePostHogIdentity();
const user = useUser();

const acceptCookies = () => {
  setChoice("accepted");
  close();
  identifyUser(user.value);
};

const rejectCookies = () => {
  setChoice("rejected");
  close();
  clearIdentity();
};
</script>

<template>
  <Transition name="cookie-popup">
    <div
      v-if="visible"
      class="cookie-popup fixed bottom-4 z-50 max-w-sm w-full left-1/2 -translate-x-1/2 md:right-4 md:left-auto md:translate-x-0"
    >
      <SCard variant="subtle" class="bg-default p-2">
        <p class="text-toned text-md mb-4">
          {{ t("components.cookiePopup.description") }}
        </p>

        <div class="flex justify-start space-x-2">
          <UButton color="primary" @click="acceptCookies">
            {{ t("common.accept") }}
          </UButton>
          <UButton variant="ghost" color="neutral" @click="rejectCookies">
            {{ t("common.decline") }}
          </UButton>
        </div>
      </SCard>
    </div>
  </Transition>
</template>

<style scoped>
.cookie-popup-enter-active,
.cookie-popup-leave-active {
  transition:
    transform var(--duration-normal) var(--ease-standard),
    opacity var(--duration-normal) ease;
}

.cookie-popup-enter-from,
.cookie-popup-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .cookie-popup-enter-active,
  .cookie-popup-leave-active {
    transition: opacity var(--duration-fast) ease;
  }

  .cookie-popup-enter-from,
  .cookie-popup-leave-to {
    transform: none;
  }
}
</style>
