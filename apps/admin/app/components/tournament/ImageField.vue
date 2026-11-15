<script lang="ts" setup>
const imageUrl = defineModel<string>({ default: "" });

defineProps<{ disabled?: boolean }>();

const emit = defineEmits<{ "update:uploading": [boolean] }>();
const uploading = ref(false);
const { t } = useI18n();

const uploadedImageUrl = computed({
  get: () => imageUrl.value || null,
  set: (value: string | null) => {
    imageUrl.value = value ?? "";
  },
});

const onUploading = (value: boolean) => {
  uploading.value = value;
  emit("update:uploading", value);
};
</script>

<template>
  <div class="flex max-w-2xl flex-col gap-4">
    <SbFormField :label="t('page.tournaments.form.image')">
      <ImageUpload
        v-model:image-url="uploadedImageUrl"
        target="tournament"
        :disabled="disabled"
        @update:uploading="onUploading"
      />
    </SbFormField>
    <SbFormField :label="t('page.tournaments.form.imageUrl')">
      <SbInput
        v-model="imageUrl"
        type="url"
        class="w-full"
        spellcheck="false"
        autocomplete="off"
        :disabled="disabled || uploading"
        :placeholder="t('page.tournaments.form.imageUrlPlaceholder')"
      />
    </SbFormField>
  </div>
</template>
