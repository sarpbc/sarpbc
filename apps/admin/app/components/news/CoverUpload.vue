<script lang="ts" setup>
const imageUrl = defineModel<string | null>("imageUrl", { default: null });

const { t } = useI18n();
const toast = useToast();
const { uploadFile, progress, isUploading, error } = useR2Upload();

const fileInput = ref<HTMLInputElement | null>(null);

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
    imageUrl.value = await uploadFile(file);
  } catch {
    toast.add({
      title: t("page.news.cover.uploadFailed"),
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
      accept="image/jpeg,image/png,image/webp,image/gif"
      class="hidden"
      @change="onFileChange"
    />
    <div v-if="imageUrl" class="flex flex-col gap-2">
      <img
        :src="imageUrl"
        alt=""
        class="max-h-40 w-full rounded-sm object-cover border border-default"
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
      </div>
    </div>
    <UButton
      v-else
      size="sm"
      color="neutral"
      variant="outline"
      icon="i-lucide-image"
      :loading="isUploading"
      @click="openFilePicker"
    >
      {{ isUploading ? $t("page.news.cover.uploading") : $t("page.news.cover.upload") }}
    </UButton>
    <p v-if="isUploading" class="text-sm text-muted">
      {{ $t("page.news.cover.progress", { percent: progress }) }}
    </p>
    <p v-if="error && !isUploading" class="text-sm text-error">
      {{ error }}
    </p>
  </div>
</template>
