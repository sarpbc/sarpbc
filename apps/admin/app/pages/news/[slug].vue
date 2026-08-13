<script lang="ts" setup>
import type { TabsItem } from "@nuxt/ui";
import { newsSurfaceClass } from "~/utils/newsEditorLayout";

type NewsEditorLocale = "en" | "fr";

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

const editorLocale = ref<NewsEditorLocale>("en");
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

const missingFrench = computed(() => !titleFr.value.trim() || !contentFr.value.trim());

const previewTitle = computed(() => {
  if (editorLocale.value === "fr" && titleFr.value.trim()) {
    return titleFr.value;
  }
  return title.value;
});

const previewContent = computed(() => {
  if (editorLocale.value === "fr" && contentFr.value.trim()) {
    return contentFr.value;
  }
  return content.value;
});

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

const tabItems: TabsItem[] = [
  {
    label: t("page.news.create.tab.write"),
    slot: "editor" as const,
    icon: "i-lucide-pencil",
  },
  {
    label: t("page.news.create.tab.preview"),
    slot: "preview" as const,
    icon: "i-lucide-eye",
  },
];
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
        class="cursor-pointer"
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
          class="cursor-pointer"
          @click="openSaveModal"
        />

        <template #body>
          <div class="flex flex-col gap-4">
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
              <NewsCoverUpload v-model:image-url="imageUrl" />
            </UFormField>
          </div>
        </template>

        <template #footer>
          <UButton
            icon="i-fluent-save-24-regular"
            :label="$t('page.news.edit.save')"
            :loading="isSaving"
            :disabled="!title || !content || !articleSlug.trim()"
            class="cursor-pointer"
            @click="saveArticle"
          />
          <UButton
            color="neutral"
            variant="subtle"
            :label="$t('page.news.create.cancel')"
            :disabled="isSaving"
            class="cursor-pointer"
            @click="isModalOpen = false"
          />
        </template>
      </UModal>
    </template>
    <UTabs
      :items="tabItems"
      color="neutral"
      variant="link"
      class="flex min-h-0 flex-1 flex-col"
      :unmount-on-hide="false"
      :ui="{
        root: 'flex flex-col flex-1 min-h-0',
        content: 'flex-1 min-h-0',
      }"
    >
      <template #editor>
        <DashboardContent class="flex min-h-0 flex-1 flex-col gap-3 p-0 px-0 py-4">
          <NewsLocaleSwitch v-model="editorLocale" :missing-french="missingFrench" />
          <div v-if="editorLocale === 'en'" class="flex min-h-0 flex-1 flex-col gap-3">
            <UFormField
              :label="$t('page.news.locale.titleEn')"
              required
              :class="[newsSurfaceClass, 'px-4']"
            >
              <UInput v-model="title" class="w-full" />
            </UFormField>
            <NewsArticleEditor v-model="content" />
          </div>
          <div v-if="editorLocale === 'fr'" class="flex min-h-0 flex-1 flex-col gap-3">
            <UFormField :label="$t('page.news.locale.titleFr')" :class="[newsSurfaceClass, 'px-4']">
              <UInput v-model="titleFr" class="w-full" />
            </UFormField>
            <NewsArticleEditor v-model="contentFr" />
          </div>
        </DashboardContent>
      </template>

      <template #preview>
        <DashboardContent class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-4">
          <NewsLocaleSwitch v-model="editorLocale" :missing-french="missingFrench" />
          <div :class="[newsSurfaceClass, 'p-4']">
            <h1 v-if="previewTitle" class="mb-4 text-2xl font-bold">
              {{ previewTitle }}
            </h1>
            <NewsMarkdownPreview v-if="previewContent" :value="previewContent" />
            <p v-else class="text-muted italic">
              {{ $t("page.news.create.preview.empty") }}
            </p>
          </div>
        </DashboardContent>
      </template>
    </UTabs>
  </NuxtLayout>
</template>
