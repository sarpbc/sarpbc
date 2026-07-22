<script lang="ts" setup>
import type { EditorToolbarItem, EditorSuggestionMenuItem, TabsItem } from "@nuxt/ui";

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

const toolbarItems: EditorToolbarItem[][] = [
  [
    {
      icon: "i-lucide-heading",
      tooltip: { text: "Headings" },
      content: {
        align: "start",
      },
      items: [
        {
          kind: "heading",
          level: 1,
          icon: "i-lucide-heading-1",
          label: "Heading 1",
        },
        {
          kind: "heading",
          level: 2,
          icon: "i-lucide-heading-2",
          label: "Heading 2",
        },
        {
          kind: "heading",
          level: 3,
          icon: "i-lucide-heading-3",
          label: "Heading 3",
        },
        {
          kind: "heading",
          level: 4,
          icon: "i-lucide-heading-4",
          label: "Heading 4",
        },
      ],
    },
  ],
  [
    {
      kind: "mark",
      mark: "bold",
      icon: "i-lucide-bold",
      tooltip: { text: "Bold" },
    },
    {
      kind: "mark",
      mark: "italic",
      icon: "i-lucide-italic",
      tooltip: { text: "Italic" },
    },
    {
      kind: "mark",
      mark: "underline",
      icon: "i-lucide-underline",
      tooltip: { text: "Underline" },
    },
    {
      kind: "mark",
      mark: "strike",
      icon: "i-lucide-strikethrough",
      tooltip: { text: "Strikethrough" },
    },
    {
      kind: "mark",
      mark: "code",
      icon: "i-lucide-code",
      tooltip: { text: "Code" },
    },
  ],
];

const suggestionItems: EditorSuggestionMenuItem[][] = [
  [
    {
      type: "label",
      label: "Text",
    },
    {
      kind: "paragraph",
      label: "Paragraph",
      icon: "i-lucide-type",
    },
    {
      kind: "heading",
      level: 1,
      label: "Heading 1",
      icon: "i-lucide-heading-1",
    },
    {
      kind: "heading",
      level: 2,
      label: "Heading 2",
      icon: "i-lucide-heading-2",
    },
    {
      kind: "heading",
      level: 3,
      label: "Heading 3",
      icon: "i-lucide-heading-3",
    },
  ],
  [
    {
      type: "label",
      label: "Lists",
    },
    {
      kind: "bulletList",
      label: "Bullet List",
      icon: "i-lucide-list",
    },
    {
      kind: "orderedList",
      label: "Numbered List",
      icon: "i-lucide-list-ordered",
    },
  ],
  [
    {
      type: "label",
      label: "Insert",
    },
    {
      kind: "blockquote",
      label: "Blockquote",
      icon: "i-lucide-text-quote",
    },
    {
      kind: "codeBlock",
      label: "Code Block",
      icon: "i-lucide-square-code",
    },
    {
      kind: "horizontalRule",
      label: "Divider",
      icon: "i-lucide-separator-horizontal",
    },
  ],
];

const title = ref(article.value?.title ?? "");
const content = ref(article.value?.content ?? "");
const isDraft = ref(article.value?.isDraft ?? true);
const isSaving = ref(false);
const isPublishing = ref(false);
const isModalOpen = ref(false);

function openSaveModal() {
  isModalOpen.value = true;
}

async function saveArticle() {
  if (!title.value || !content.value) {
    return;
  }

  isSaving.value = true;
  try {
    const ok = await editNewsArticle(slug, {
      title: title.value,
      content: content.value,
    });
    if (!ok) {
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
          <UFormField :label="$t('page.news.create.titleField')" required>
            <UInput v-model="title" class="w-full" autofocus @keydown.enter="saveArticle" />
          </UFormField>
        </template>

        <template #footer>
          <UButton
            icon="i-fluent-save-24-regular"
            :label="$t('page.news.edit.save')"
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
      :ui="{
        root: 'flex flex-col flex-1 min-h-0',
        content: 'flex-1 min-h-0',
      }"
    >
      <template #editor>
        <DashboardContent class="p-0 px-0 py-4">
          <UEditor
            v-slot="{ editor }"
            v-model="content"
            :placeholder="$t('page.news.create.placeholder')"
            content-type="markdown"
            class="h-full flex-1"
          >
            <UEditorToolbar :editor="editor" :items="toolbarItems" layout="bubble" />
            <UEditorSuggestionMenu :editor="editor" :items="suggestionItems" />
            <UEditorDragHandle :editor="editor" icon="i-fluent-re-order-dots-vertical-24-regular" />
          </UEditor>
        </DashboardContent>
      </template>

      <template #preview>
        <DashboardContent class="overflow-y-auto px-8">
          <h1 v-if="title" class="mb-4 text-2xl font-bold">
            {{ title }}
          </h1>
          <pre v-if="content" class="font-sans text-base leading-relaxed whitespace-pre-wrap">{{
            content
          }}</pre>
          <p v-else class="text-muted italic">
            {{ $t("page.news.create.preview.empty") }}
          </p>
        </DashboardContent>
      </template>
    </UTabs>
  </NuxtLayout>
</template>
