<script setup lang="ts">
import { parseTweetUrl } from "@sarpbc/utils";

const props = defineProps<{
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
const canInsert = computed(() => parsed.value != null);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      url.value = "";
      submitted.value = false;
    }
  },
);

function close() {
  emit("update:open", false);
}

function confirm() {
  submitted.value = true;
  if (!parsed.value) {
    return;
  }
  emit("select", parsed.value.url);
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('page.news.editor.tweet.title')"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form class="flex flex-col gap-3" @submit.prevent="confirm">
        <UFormField
          :label="t('page.news.editor.tweet.urlLabel')"
          name="tweetUrl"
          :error="invalid ? t('page.news.editor.tweet.urlInvalid') : undefined"
        >
          <UInput
            v-model="url"
            :placeholder="t('page.news.editor.tweet.urlPlaceholder')"
            autofocus
            icon="i-ri-twitter-x-fill"
          />
        </UFormField>
      </form>
    </template>

    <template #footer>
      <UButton
        icon="i-ri-twitter-x-fill"
        :label="t('page.news.editor.tweet.insert')"
        :disabled="!canInsert"
        @click="confirm"
      />
      <UButton color="neutral" variant="subtle" :label="t('common.cancel')" @click="close" />
    </template>
  </UModal>
</template>
