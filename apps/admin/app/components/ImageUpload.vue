<script lang="ts" setup>
const imageUrl = defineModel<string | null>("imageUrl", { default: null });

const props = defineProps<{
  target: "news" | "tournament";
  disabled?: boolean;
  articleSlug?: string;
  articleTitle?: string;
}>();

const emit = defineEmits<{ "update:uploading": [boolean] }>();

const { t } = useI18n();
const toast = useToast();
const { uploadFile, progress, isUploading, error } = useR2Upload();
watch(isUploading, (value) => emit("update:uploading", value));

const fileInput = ref<HTMLInputElement | null>(null);

const displayError = computed(() => {
  if (!error.value || isUploading.value) {
    return null;
  }
  if (error.value === "server") {
    return t("imageUpload.uploadServerError");
  }
  return error.value;
});

function openFilePicker() {
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
    imageUrl.value = await uploadFile(file, {
      target: props.target,
      articleSlug: props.articleSlug,
      articleTitle: props.articleTitle,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    toast.add({
      title: t("imageUpload.uploadFailed"),
      description:
        message === "server" || message.length === 0 ? t("imageUpload.uploadServerError") : message,
      color: "error",
    });
  }
}

function clearCover() {
  imageUrl.value = null;
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
      class="hidden"
      :disabled="disabled || isUploading"
      @change="onFileChange"
    />
    <div v-if="imageUrl" class="flex flex-col gap-2">
      <img
        :src="imageUrl"
        alt=""
        class="max-h-40 w-full rounded-sm object-contain border border-default"
      />
      <div class="flex flex-wrap gap-2">
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          :disabled="disabled || isUploading"
          @click="openFilePicker"
        >
          {{ t("imageUpload.replace") }}
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          :disabled="disabled || isUploading"
          @click="clearCover"
        >
          {{ t("imageUpload.remove") }}
        </UButton>
      </div>
    </div>
    <UButton
      v-else
      size="sm"
      color="neutral"
      variant="outline"
      icon="i-lucide-image"
      :loading="isUploading"
      :disabled="disabled || isUploading"
      @click="openFilePicker"
    >
      {{ t("imageUpload.upload") }}
    </UButton>
    <p v-if="isUploading" class="text-sm text-muted">
      {{ t("imageUpload.progress", { percent: progress }) }}
    </p>
    <p class="text-xs text-muted">{{ t("imageUpload.hint") }}</p>
    <p v-if="displayError" class="text-sm text-error">
      {{ displayError }}
    </p>
  </div>
</template>
