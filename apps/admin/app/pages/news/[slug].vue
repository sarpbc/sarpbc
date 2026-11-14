<script lang="ts" setup>
import type { NewsType } from "@sarpbc/types";
import { getApiErrorMessage } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();
const slug = String(useRoute().params.slug);

const {
  data: article,
  error,
  refresh,
} = await useAsyncData(`admin-news-${slug}`, () => getNewsArticleAdmin(slug));

const items = computed(() => [
  {
    label: t("page.news.title"),
    to: localePath("/news"),
  },
  {
    label: article.value?.title ?? slug,
  },
]);

const title = ref("");
const titleFr = ref("");
const articleSlug = ref("");
const content = ref("");
const contentFr = ref("");
const imageUrl = ref<string | null>(null);
const articleType = ref<NewsType>("short");
const isDraft = ref(true);

watch(
  article,
  (loaded) => {
    if (!loaded) {
      return;
    }

    title.value = loaded.title;
    titleFr.value = loaded.titleFr ?? "";
    articleSlug.value = loaded.slug;
    content.value = loaded.content;
    contentFr.value = loaded.contentFr ?? "";
    imageUrl.value = loaded.imageUrl ?? null;
    articleType.value = loaded.type ?? "short";
    isDraft.value = loaded.isDraft;
  },
  { immediate: true },
);

const isSaving = ref(false);
const isPublishing = ref(false);
const isModalOpen = ref(false);

const openSaveModal = () => {
  isModalOpen.value = true;
};

const saveArticle = async () => {
  if (!title.value || !content.value || !articleSlug.value.trim()) {
    return;
  }

  isSaving.value = true;

  try {
    const updated = await editNewsArticle(slug, {
      title: title.value,
      content: content.value,
      titleFr: titleFr.value.trim() || null,
      contentFr: contentFr.value.trim() || null,
      slug: articleSlug.value.trim(),
      imageUrl: imageUrl.value,
      type: articleType.value,
    });

    isModalOpen.value = false;
    toast.add({
      title: t("page.news.edit.saved"),
      color: "success",
    });

    if (updated.slug !== slug) {
      await navigateTo(localePath(`/news/${updated.slug}`));
    }
  } catch (saveError) {
    reportError(saveError, t("page.news.edit.saveFailed"));
  } finally {
    isSaving.value = false;
  }
};

const togglePublish = async () => {
  if (isPublishing.value) {
    return;
  }

  isPublishing.value = true;

  try {
    await (isDraft.value ? publishNewsArticle(slug) : unpublishNewsArticle(slug));

    isDraft.value = !isDraft.value;
    toast.add({
      title: isDraft.value ? t("page.news.edit.unpublished") : t("page.news.edit.published"),
      color: "success",
    });
  } catch (publishError) {
    reportError(publishError, t("page.news.edit.publishFailed"));
  } finally {
    isPublishing.value = false;
  }
};
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="items" />
    </template>
    <template #action>
      <UButton
        color="neutral"
        variant="outline"
        :loading="isPublishing"
        :disabled="isPublishing || isSaving"
        @click="togglePublish"
      >
        {{ isDraft ? $t("page.news.edit.publish") : $t("page.news.edit.unpublish") }}
      </UButton>
      <UModal
        v-model:open="isModalOpen"
        :title="$t('page.news.edit.save')"
        :dismissible="!isSaving"
      >
        <UButton
          icon="i-fluent-save-24-regular"
          :label="$t('page.news.edit.save')"
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
              required
            >
              <UInput
                v-model="articleSlug"
                class="w-full"
                :placeholder="$t('page.news.create.slugPlaceholder')"
                spellcheck="false"
                autocomplete="off"
                @keydown.enter="saveArticle"
              />
            </UFormField>
            <UFormField :label="$t('page.news.type.label')" name="type">
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
            </UFormField>
            <UFormField :label="$t('page.news.cover.label')">
              <ImageUpload
                target="news"
                v-model:image-url="imageUrl"
                :article-slug="articleSlug"
                :article-title="title"
              />
            </UFormField>
          </div>
        </template>

        <template #footer>
          <UButton
            icon="i-fluent-save-24-regular"
            :label="$t('page.news.edit.save')"
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

    <LoadError
      v-if="error"
      :message="getApiErrorMessage(error) ?? $t('common.loadFailed')"
      @retry="refresh()"
    />
    <NewsArticleForm
      v-else
      v-model:title="title"
      v-model:title-fr="titleFr"
      v-model:content="content"
      v-model:content-fr="contentFr"
    />
  </NuxtLayout>
</template>
