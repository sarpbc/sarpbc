<script lang="ts" setup>
const { action } = defineProps<{
  action: "create" | "reply";
}>();

const { t } = useI18n();
const localePath = useLocalePath();
const user = useUser();

/** `undefined` = session still resolving — avoid flashing the sign-in CTA. */
const sessionReady = computed(() => user.value !== undefined);
const isSignedIn = computed(() => !!user.value);

const signInLabel = computed(() =>
  action === "create" ? t("components.forum.signInToCreate") : t("page.forum.post.signInToReply"),
);
</script>

<template>
  <slot v-if="isSignedIn" />
  <ULink
    v-else-if="sessionReady"
    :to="localePath('/login')"
    :class="
      action === 'create'
        ? 'w-full h-full flex items-center justify-center text-sm text-primary'
        : 'text-sm text-primary'
    "
  >
    {{ signInLabel }}
  </ULink>
</template>
