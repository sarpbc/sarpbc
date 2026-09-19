<script lang="ts" setup>
const imageUrl = defineModel<string | null>("imageUrl", { default: null });

const props = defineProps<{
  articleSlug?: string;
  articleTitle?: string;
}>();

const { t } = useI18n();
const toast = useToast();
const { uploadFile, progress, isUploading, error } = useR2Upload();

const fileInput = ref<HTMLInputElement | null>(null);
const source = ref("");
const sourceUrl = ref("");
const isLibraryOpen = ref(false);

const displayError = computed(() => {
  if (!error.value || isUploading.value) {
    return null;
  }
  if (error.value === "server") {
    return t("page.news.cover.uploadServerError");
  }
  return error.value;
});

const attributionIncomplete = computed(
  () => source.value.trim().length === 0 || sourceUrl.value.trim().length === 0,
);

function openFilePicker() {
  if (attributionIncomplete.value) {
    toast.add({
      title: t("page.media.attribution.required"),
      color: "warning",
    });
    return;
  }
  fileInput.value?.click();
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) {
    return;
  }

  try {
    const response = await uploadFile(file, {
      articleSlug: props.articleSlug,
      articleTitle: props.articleTitle,
      source: source.value,
      sourceUrl: sourceUrl.value,
    });
    imageUrl.value = response.publicUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    toast.add({
      title: t("page.news.cover.uploadFailed"),
      description:
        message === "server" || message.length === 0
          ? t("page.news.cover.uploadServerError")
          : message,
      color: "error",
    });
  }
}

function clearCover() {
  imageUrl.value = null;
}

function onLibrarySelect(image: { url: string; source: string | null; sourceUrl: string | null }) {
  imageUrl.value = image.url;
  if (image.source) {
    source.value = image.source;
  }
  if (image.sourceUrl) {
    sourceUrl.value = image.sourceUrl;
  }
  isLibraryOpen.value = false;
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="grid gap-3 sm:grid-cols-2">
      <UFormField :label="$t('page.media.fields.source')" name="coverSource" required>
        <UInput
          v-model="source"
          class="w-full"
          :placeholder="$t('page.media.fields.sourcePlaceholder')"
        />
      </UFormField>
      <UFormField :label="$t('page.media.fields.sourceUrl')" name="coverSourceUrl" required>
        <UInput
          v-model="sourceUrl"
          class="w-full"
          type="url"
          inputmode="url"
          :placeholder="$t('page.media.fields.sourceUrlPlaceholder')"
        />
      </UFormField>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
      class="hidden"
      @change="onFileChange"
    />

    <div v-if="imageUrl" class="flex flex-col gap-2">
      <img
        :src="imageUrl"
        alt=""
        class="max-h-40 w-full rounded-sm border border-default object-cover"
      />
      <div class="flex flex-wrap gap-2">
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          :disabled="isUploading"
          @click="openFilePicker"
        >
          {{ $t("page.news.cover.replace") }}
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          :disabled="isUploading"
          @click="clearCover"
        >
          {{ $t("page.news.cover.remove") }}
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          :disabled="isUploading"
          @click="isLibraryOpen = true"
        >
          {{ $t("page.media.picker.open") }}
        </UButton>
      </div>
    </div>
    <div v-else class="flex flex-wrap gap-2">
      <UButton
        size="sm"
        color="neutral"
        variant="outline"
        icon="i-lucide-image"
        :loading="isUploading"
        @click="openFilePicker"
      >
        {{ isUploading ? $t("page.news.cover.uploading") : $t("page.news.cover.upload") }}
      </UButton>
      <UButton
        size="sm"
        color="neutral"
        variant="outline"
        icon="i-lucide-images"
        :disabled="isUploading"
        @click="isLibraryOpen = true"
      >
        {{ $t("page.media.picker.open") }}
      </UButton>
    </div>

    <p v-if="isUploading" class="text-sm text-muted">
      {{ $t("page.news.cover.progress", { percent: progress }) }}
    </p>
    <p v-if="displayError" class="text-sm text-error">
      {{ displayError }}
    </p>

    <UModal v-model:open="isLibraryOpen" :title="$t('page.media.picker.title')">
      <template #body>
        <MediaPicker @select="onLibrarySelect" />
      </template>
    </UModal>
  </div>
</template>
