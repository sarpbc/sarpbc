<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import { newsSurfaceClass } from "~/utils/newsEditorLayout";

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
const articleSlug = ref("");
const slugTouched = ref(false);
const content = ref("");
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
      ...(trimmedSlug ? { slug: trimmedSlug } : {}),
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
            <UFormField :label="$t('page.news.create.titleField')" required>
              <UInput v-model="title" class="w-full" autofocus @keydown.enter="saveArticle" />
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
        <DashboardContent class="p-0 px-0 py-4">
          <NewsArticleEditor v-model="content" />
        </DashboardContent>
      </template>

      <template #preview>
        <DashboardContent class="overflow-y-auto py-4">
          <div :class="[newsSurfaceClass, 'p-4']">
            <h1 v-if="title" class="mb-4 text-2xl font-bold">
              {{ title }}
            </h1>
            <NewsMarkdownPreview v-if="content" :value="content" />
            <p v-else class="text-muted italic">
              {{ $t("page.news.create.preview.empty") }}
            </p>
          </div>
        </DashboardContent>
      </template>
    </UTabs>
  </NuxtLayout>
</template>
