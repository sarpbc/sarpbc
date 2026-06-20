<script setup lang="ts">
import type { EditorSuggestionMenuItem, EditorToolbarItem, TabsItem } from "@nuxt/ui";

const { t } = useI18n();
const localePath = useLocalePath();

const items = [
  {
    label: t("page.dashboard.news.title"),
    to: localePath("/dashboard/news"),
  },
  {
    label: t("page.dashboard.news.create.title"),
  },
];

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

const { progress: uploadProgress, isUploading } = useImageUpload();

const title = ref("");
const content = ref("");
const imageFile = ref<File | null>(null);
const isSaving = ref(false);
const isModalOpen = ref(false);

function openSaveModal() {
  isModalOpen.value = true;
}

function onImageChange(event: Event) {
  const input = event.target as HTMLInputElement;
  imageFile.value = input.files?.[0] ?? null;
}

async function saveArticle() {
  if (!title.value || !content.value) {
    return;
  }

  isSaving.value = true;
  try {
    // let imageUrl: string | undefined;
    if (imageFile.value) {
      // imageUrl = await uploadImage(imageFile.value);
    }
    await createNewsArticle({
      title: title.value,
      content: content.value,
    });
    isModalOpen.value = false;
  } catch (error) {
    console.error("Failed to save article:", error);
  } finally {
    isSaving.value = false;
  }
}

const appendToBody = false ? () => document.body : undefined;

const tabItems: TabsItem[] = [
  {
    label: t("page.dashboard.news.create.tab.write"),
    slot: "editor" as const,
    icon: "i-lucide-pencil",
  },
  {
    label: t("page.dashboard.news.create.tab.preview"),
    slot: "preview" as const,
    icon: "i-lucide-eye",
  },
];
</script>

<template>
  <NuxtLayout name="dashboardheader">
    <template #breadcrumb>
      <UBreadcrumb :items="items" />
    </template>
    <template #action>
      <UModal
        v-model:open="isModalOpen"
        :title="$t('page.dashboard.news.create.title')"
        :dismissible="!isSaving"
      >
        <UButton
          icon="i-fluent-save-24-regular"
          :label="$t('page.dashboard.news.create.save')"
          class="cursor-pointer"
          @click="openSaveModal"
        />

        <template #body>
          <UFormField :label="$t('page.dashboard.news.create.title')" required>
            <UInput v-model="title" class="w-full" autofocus @keydown.enter="saveArticle" />
          </UFormField>
          <UFormField :label="$t('page.dashboard.news.create.image')" class="mt-4">
            <input
              type="file"
              accept="image/*"
              class="w-full text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-sm file:font-medium"
              :disabled="isSaving"
              @change="onImageChange"
            />
            <UProgress v-if="isUploading" :value="uploadProgress" class="mt-2" />
          </UFormField>
        </template>

        <template #footer>
          <UButton
            icon="i-fluent-save-24-regular"
            :label="$t('page.dashboard.news.create.save')"
            :loading="isSaving"
            :disabled="!title"
            class="cursor-pointer"
            @click="saveArticle"
          />
          <UButton
            color="neutral"
            variant="subtle"
            label="Cancel"
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
      class="flex-1 flex flex-col min-h-0"
      :unmount-on-hide="false"
      :ui="{ root: 'flex flex-col flex-1 min-h-0', content: 'flex-1 min-h-0' }"
    >
      <template #editor>
        <DashboardContent class="p-0 py-4 px-0">
          <UEditor
            v-slot="{ editor }"
            v-model="content"
            placeholder="Start writing the article content..."
            content-type="markdown"
            class="flex-1 h-full"
          >
            <UEditorToolbar :editor="editor" :items="toolbarItems" layout="bubble" />
            <UEditorSuggestionMenu
              :editor="editor"
              :items="suggestionItems"
              :append-to="appendToBody"
            />
            <UEditorDragHandle :editor="editor" icon="i-fluent-re-order-dots-vertical-24-regular" />
          </UEditor>
        </DashboardContent>
      </template>

      <template #preview>
        <DashboardContent class="py-4 px-10 overflow-y-auto">
          <h1 v-if="title" class="text-2xl font-bold mb-4">
            {{ title }}
          </h1>
          <MDC v-if="content" :value="content" />
          <p v-else class="text-muted italic">
            {{ $t("page.dashboard.news.create.preview.empty") }}
          </p>
        </DashboardContent>
      </template>
    </UTabs>
  </NuxtLayout>
</template>
