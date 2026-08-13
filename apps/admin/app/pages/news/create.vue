<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import { newsSurfaceClass } from "~/utils/newsEditorLayout";

type NewsEditorLocale = "en" | "fr";

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

const editorLocale = ref<NewsEditorLocale>("en");
const title = ref("");
const titleFr = ref("");
const articleSlug = ref("");
const slugTouched = ref(false);
const content = ref("");
const contentFr = ref("");
const imageUrl = ref<string | null>(null);
const isSaving = ref(false);
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
      <UModal
        v-model:open="isModalOpen"
        :title="$t('page.news.create.title')"
        :dismissible="!isSaving"
      >
        <UButton
          icon="i-fluent-save-24-regular"
          :label="$t('page.news.create.save')"
          class="cursor-pointer"
          @click="openSaveModal"
        />

        <template #body>
          <div class="flex flex-col gap-4">
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
            :disabled="!title || !content"
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
      :ui="{ root: 'flex flex-col flex-1 min-h-0', content: 'flex-1 min-h-0' }"
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
