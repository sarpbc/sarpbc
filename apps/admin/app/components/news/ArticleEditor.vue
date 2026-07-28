<script setup lang="ts">
import type { EditorSuggestionMenuItem, EditorToolbarItem } from "@nuxt/ui";
import { entityTagEditorExtensions } from "~/utils/editor/entityTagNode";
import { useEntityTagEditor } from "~/composables/useEntityTagEditor";
import { newsSurfaceClass } from "~/utils/newsEditorLayout";

const content = defineModel<string>({ required: true });

const { t } = useI18n();
const { pickerOpen, pickerKind, entityTagHandlers, insertEntityTag } = useEntityTagEditor();

const appendToBody = () => document.body;
const floatingMenuOptions = { strategy: "fixed" as const };

const toolbarItems: EditorToolbarItem[][] = [
  [
    {
      icon: "i-lucide-heading",
      tooltip: { text: "Headings" },
      content: {
        align: "start",
      },
      items: [
        { kind: "heading", level: 1, icon: "i-lucide-heading-1", label: "Heading 1" },
        { kind: "heading", level: 2, icon: "i-lucide-heading-2", label: "Heading 2" },
        { kind: "heading", level: 3, icon: "i-lucide-heading-3", label: "Heading 3" },
        { kind: "heading", level: 4, icon: "i-lucide-heading-4", label: "Heading 4" },
      ],
    },
  ],
  [
    { kind: "mark", mark: "bold", icon: "i-lucide-bold", tooltip: { text: "Bold" } },
    { kind: "mark", mark: "italic", icon: "i-lucide-italic", tooltip: { text: "Italic" } },
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
    { kind: "mark", mark: "code", icon: "i-lucide-code", tooltip: { text: "Code" } },
  ],
];

const suggestionItems = computed<EditorSuggestionMenuItem[][]>(() => [
  [
    { type: "label", label: "Text" },
    { kind: "paragraph", label: "Paragraph", icon: "i-lucide-type" },
    { kind: "heading", level: 1, label: "Heading 1", icon: "i-lucide-heading-1" },
    { kind: "heading", level: 2, label: "Heading 2", icon: "i-lucide-heading-2" },
    { kind: "heading", level: 3, label: "Heading 3", icon: "i-lucide-heading-3" },
  ],
  [
    { type: "label", label: "Lists" },
    { kind: "bulletList", label: "Bullet List", icon: "i-lucide-list" },
    { kind: "orderedList", label: "Numbered List", icon: "i-lucide-list-ordered" },
  ],
  [
    { type: "label", label: "Insert" },
    { kind: "blockquote", label: "Blockquote", icon: "i-lucide-text-quote" },
    { kind: "codeBlock", label: "Code Block", icon: "i-lucide-square-code" },
    {
      kind: "horizontalRule",
      label: "Divider",
      icon: "i-lucide-separator-horizontal",
    },
    {
      kind: "playerTag",
      label: t("page.news.editor.insertPlayer"),
      icon: "i-fluent-person-24-regular",
    },
    {
      kind: "teamTag",
      label: t("page.news.editor.insertTeam"),
      icon: "i-fluent-people-team-24-regular",
    },
  ],
]);
</script>

<template>
  <UEditor
    v-slot="{ editor }"
    v-model="content"
    :placeholder="$t('page.news.create.placeholder')"
    content-type="markdown"
    :class="[newsSurfaceClass, 'h-full flex-1']"
    :ui="{ base: 'sm:px-4' }"
    :extensions="entityTagEditorExtensions"
    :handlers="entityTagHandlers"
  >
    <UEditorToolbar
      :editor="editor"
      :items="toolbarItems"
      layout="bubble"
      :append-to="appendToBody"
      :options="floatingMenuOptions"
    />
    <UEditorSuggestionMenu
      :editor="editor"
      :items="suggestionItems"
      :append-to="appendToBody"
      :options="floatingMenuOptions"
    />
    <UEditorDragHandle :editor="editor" icon="i-fluent-re-order-dots-vertical-24-regular" />
  </UEditor>

  <NewsEntityTagPicker v-model:open="pickerOpen" :kind="pickerKind" @select="insertEntityTag" />
</template>
