<script lang="ts" setup>
const { t } = useI18n();

const user = useUser();
const isClient = ref(false);

onMounted(() => {
  isClient.value = true;
});
</script>

<template>
  <ClientOnly>
    <ULink
      v-if="!user"
      :to="$localePath('/login')"
      class="text-muted hover:text-highlighted text-lg lg:text-sm font-semibold lg:font-normal"
    >
      {{ t("components.header.signin") }}
    </ULink>
    <ULink
      v-else
      :to="$localePath('/profile')"
      class="truncate text-muted hover:text-highlighted text-lg lg:text-sm font-semibold lg:font-normal"
    >
      {{ `${user.userName}` }}
    </ULink>
    <template #fallback>
      <ULink
        :to="$localePath('/login')"
        class="text-muted hover:text-highlighted text-lg lg:text-sm font-semibold lg:font-normal"
      >
        {{ t("components.header.signin") }}
      </ULink>
    </template>
  </ClientOnly>
</template>
