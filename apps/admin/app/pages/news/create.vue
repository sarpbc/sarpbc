<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();

const items = [
  {
    label: t("page.news.title"),
    to: localePath("/news"),
  },
  {
    label: t("page.news.create.title"),
  },
];

const title = ref("");
const titleFr = ref("");
const articleSlug = ref("");
const slugTouched = ref(false);
const content = ref("");
const contentFr = ref("");
const imageUrl = ref<string | null>(null);
const isSaving = ref(false);
const isModalOpen = ref(false);

function suggestSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

watch(title, (next) => {
  if (!slugTouched.value) {
    articleSlug.value = suggestSlug(next);
  }
});

function onSlugInput(value: string) {
  slugTouched.value = true;
  articleSlug.value = value;
}

function openSaveModal() {
  if (!slugTouched.value && title.value) {
    articleSlug.value = suggestSlug(title.value);
  }
  isModalOpen.value = true;
}

async function saveArticle() {
  if (!title.value || !content.value) {
    return;
  }

  isSaving.value = true;
  try {
    const trimmedSlug = articleSlug.value.trim();
    const created = await createNewsArticle({
      title: title.value,
      content: content.value,
      titleFr: titleFr.value.trim() || null,
      contentFr: contentFr.value.trim() || null,
      slug: trimmedSlug || undefined,
      imageUrl: imageUrl.value ?? undefined,
    });
    if (!created) {
      toast.add({
        title: t("page.news.create.saveFailed"),
        color: "error",
      });
      return;
    }
    isModalOpen.value = false;
    toast.add({
      title: t("page.news.create.saved"),
      color: "success",
    });
    await navigateTo(localePath(`/news/${created.slug}`));
  } catch (error) {
    console.error("Failed to save article:", error);
    toast.add({
      title: t("page.news.create.saveFailed"),
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="items" />
    </template>
    <template #action>
      <UModal
        v-model:open="isModalOpen"
        :title="$t('page.news.create.title')"
        :dismissible="!isSaving"
      >
        <UButton
          icon="i-fluent-save-24-regular"
          :label="$t('page.news.create.save')"
          @click="openSaveModal"
        />

        <template #body>
          <div class="flex flex-col gap-4">
            <UFormField :label="$t('page.news.locale.titleEn')" name="title" required>
              <UInput v-model="title" class="w-full" />
            </UFormField>
            <UFormField
              :label="$t('page.news.locale.titleFr')"
              name="titleFr"
              :hint="$t('page.news.locale.fallbackHint')"
            >
              <UInput v-model="titleFr" class="w-full" />
            </UFormField>
            <UFormField
              :label="$t('page.news.create.slugField')"
              :hint="$t('page.news.create.slugHint')"
            >
              <UInput
                :model-value="articleSlug"
                class="w-full"
                :placeholder="$t('page.news.create.slugPlaceholder')"
                spellcheck="false"
                autocomplete="off"
                @update:model-value="onSlugInput"
                @keydown.enter="saveArticle"
              />
            </UFormField>
            <UFormField :label="$t('page.news.cover.label')">
              <NewsCoverUpload v-model:image-url="imageUrl" />
            </UFormField>
          </div>
        </template>

        <template #footer>
          <UButton
            icon="i-fluent-save-24-regular"
            :label="$t('page.news.create.save')"
            :loading="isSaving"
            :disabled="isSaving"
            @click="saveArticle"
          />
          <UButton
            color="neutral"
            variant="subtle"
            :label="$t('page.news.create.cancel')"
            :disabled="isSaving"
            @click="isModalOpen = false"
          />
        </template>
      </UModal>
    </template>

    <NewsArticleForm
      v-model:title="title"
      v-model:title-fr="titleFr"
      v-model:content="content"
      v-model:content-fr="contentFr"
    />
  </NuxtLayout>
</template>
