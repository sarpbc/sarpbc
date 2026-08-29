<script lang="ts" setup>
const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const slug = useRoute().params.slug as string;

const { data: article } = await useAsyncData(`admin-news-${slug}`, () => getNewsArticleAdmin(slug));

const items = computed(() => [
  {
    label: t("page.news.title"),
    to: localePath("/news"),
  },
  {
    label: article.value?.title ?? slug,
  },
]);

const title = ref(article.value?.title ?? "");
const titleFr = ref(article.value?.titleFr ?? "");
const articleSlug = ref(article.value?.slug ?? "");
const content = ref(article.value?.content ?? "");
const contentFr = ref(article.value?.contentFr ?? "");
const imageUrl = ref<string | null>(article.value?.imageUrl ?? null);
const isDraft = ref(article.value?.isDraft ?? true);
const isSaving = ref(false);
const isPublishing = ref(false);
const isModalOpen = ref(false);

function openSaveModal() {
  isModalOpen.value = true;
}

async function saveArticle() {
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
    });
    if (!updated) {
      toast.add({
        title: t("page.news.edit.saveFailed"),
        color: "error",
      });
      return;
    }
    isModalOpen.value = false;
    toast.add({
      title: t("page.news.edit.saved"),
      color: "success",
    });
    if (updated.slug !== slug) {
      await navigateTo(localePath(`/news/${updated.slug}`));
    }
  } catch (error) {
    console.error("Failed to save article:", error);
    toast.add({
      title: t("page.news.edit.saveFailed"),
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
}

async function togglePublish() {
  if (isPublishing.value) {
    return;
  }
  isPublishing.value = true;
  try {
    const ok = isDraft.value ? await publishNewsArticle(slug) : await unpublishNewsArticle(slug);
    if (!ok) {
      toast.add({
        title: t("page.news.edit.publishFailed"),
        color: "error",
      });
      return;
    }
    isDraft.value = !isDraft.value;
    toast.add({
      title: isDraft.value ? t("page.news.edit.unpublished") : t("page.news.edit.published"),
      color: "success",
    });
  } finally {
    isPublishing.value = false;
  }
}
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
            <UFormField :label="$t('page.news.cover.label')">
              <NewsCoverUpload
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

    <NewsArticleForm
      v-model:title="title"
      v-model:title-fr="titleFr"
      v-model:content="content"
      v-model:content-fr="contentFr"
    />
  </NuxtLayout>
</template>
