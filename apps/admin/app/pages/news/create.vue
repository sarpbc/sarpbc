<script setup lang="ts">
import type { NewsType } from "@sarpbc/types";
import { toSlug } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

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
const articleType = ref<NewsType>("short");
const isSaving = ref(false);
const isModalOpen = ref(false);

watch(title, (next) => {
  if (!slugTouched.value) {
    articleSlug.value = toSlug(next);
  }
});

const onSlugInput = (value: string) => {
  slugTouched.value = true;
  articleSlug.value = value;
};

const openSaveModal = () => {
  if (!slugTouched.value && title.value) {
    articleSlug.value = toSlug(title.value);
  }

  isModalOpen.value = true;
};

const saveArticle = async () => {
  if (!title.value || !content.value) {
    return;
  }

  isSaving.value = true;

  try {
    const trimmedSlug = articleSlug.value.trim();

    const created = await createNewsArticle({
      content: content.value,
      contentFr: contentFr.value.trim() || null,
      imageUrl: imageUrl.value ?? undefined,
      slug: trimmedSlug || undefined,
      title: title.value,
      titleFr: titleFr.value.trim() || null,
      type: articleType.value,
    });

    isModalOpen.value = false;
    toast.add({
      color: "success",
      title: t("page.news.create.saved"),
    });
    await navigateTo(localePath(`/news/${created.slug}`));
  } catch (saveError) {
    reportError(saveError, t("page.news.create.saveFailed"));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="items" />
    </template>
    <template #action>
      <SbModal
        v-model:open="isModalOpen"
        :title="$t('page.news.create.title')"
        :dismissible="!isSaving"
      >
        <SbButton
          icon="i-fluent-save-24-regular"
          :label="$t('page.news.create.save')"
          @click="openSaveModal"
        />

        <template #body>
          <div class="flex flex-col gap-4">
            <SbFormField :label="$t('page.news.locale.titleEn')" required>
              <SbInput v-model="title" class="w-full" />
            </SbFormField>
            <SbFormField
              :label="$t('page.news.locale.titleFr')"
              :hint="$t('page.news.locale.fallbackHint')"
            >
              <SbInput v-model="titleFr" class="w-full" />
            </SbFormField>
            <SbFormField
              :label="$t('page.news.create.slugField')"
              :hint="$t('page.news.create.slugHint')"
            >
              <SbInput
                :model-value="articleSlug"
                class="w-full"
                :placeholder="$t('page.news.create.slugPlaceholder')"
                spellcheck="false"
                autocomplete="off"
                @update:model-value="onSlugInput"
                @keydown.enter="saveArticle"
              />
            </SbFormField>
            <SbFormField :label="$t('page.news.type.label')">
              <URadioGroup
                v-model="articleType"
                variant="list"
                :items="[
                  {
                    value: 'short',
                    label: $t('page.news.type.shortLabel'),
                    description: $t('page.news.type.shortDescription'),
                  },
                  {
                    value: 'article',
                    label: $t('page.news.type.articleLabel'),
                    description: $t('page.news.type.articleDescription'),
                  },
                ]"
                value-key="value"
                label-key="label"
              />
            </SbFormField>
            <SbFormField :label="$t('page.news.cover.label')">
              <ImageUpload
                target="news"
                v-model:image-url="imageUrl"
                :article-slug="articleSlug"
                :article-title="title"
              />
            </SbFormField>
          </div>
        </template>

        <template #footer>
          <SbButton
            icon="i-fluent-save-24-regular"
            :label="$t('page.news.create.save')"
            :loading="isSaving"
            :disabled="isSaving"
            @click="saveArticle"
          />
          <SbButton
            variant="secondary"
            :label="$t('page.news.create.cancel')"
            :disabled="isSaving"
            @click="isModalOpen = false"
          />
        </template>
      </SbModal>
    </template>

    <NewsArticleForm
      v-model:title="title"
      v-model:title-fr="titleFr"
      v-model:content="content"
      v-model:content-fr="contentFr"
    />
  </NuxtLayout>
</template>
