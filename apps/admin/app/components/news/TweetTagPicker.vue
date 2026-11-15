<script setup lang="ts">
import { parseTweetUrl } from "@sarpbc/utils";

const { open } = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  select: [url: string];
}>();

const { t } = useI18n();
const url = ref("");
const submitted = ref(false);

const parsed = computed(() => parseTweetUrl(url.value));
const invalid = computed(() => submitted.value && url.value.trim().length > 0 && !parsed.value);
const canInsert = computed(() => parsed.value !== null);

watch(
  () => open,
  (isOpen) => {
    if (isOpen) {
      url.value = "";
      submitted.value = false;
    }
  },
);

const close = () => {
  emit("update:open", false);
};

const confirm = () => {
  submitted.value = true;

  if (!parsed.value) {
    return;
  }

  emit("select", parsed.value.url);
};
</script>

<template>
  <SModal
    :open="open"
    :title="t('page.news.editor.tweet.title')"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form class="flex flex-col gap-3" @submit.prevent="confirm">
        <SFormField
          :label="t('page.news.editor.tweet.urlLabel')"
          :error="invalid ? t('page.news.editor.tweet.urlInvalid') : undefined"
        >
          <SInput
            v-model="url"
            :placeholder="t('page.news.editor.tweet.urlPlaceholder')"
            autofocus
            icon="i-ri-twitter-x-fill"
          />
        </SFormField>
      </form>
    </template>

    <template #footer>
      <SButton
        icon="i-ri-twitter-x-fill"
        :label="t('page.news.editor.tweet.insert')"
        :disabled="!canInsert"
        @click="confirm"
      />
      <SButton variant="secondary" :label="t('common.cancel')" @click="close" />
    </template>
  </SModal>
</template>
