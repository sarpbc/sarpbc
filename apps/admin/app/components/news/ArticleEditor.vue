<script setup lang="ts">
import type { EditorSuggestionMenuItem, EditorToolbarItem } from "@nuxt/ui";
import { entityTagEditorExtensions } from "~/utils/editor/entity-tag-node";
import { TweetTagNode } from "~/utils/editor/tweet-tag-node";
import { MatchBlockNode } from "~/utils/editor/match-block-node";
import { tableEditorExtensions } from "~/utils/editor/table-extensions";
import { useEntityTagEditor } from "~/composables/use-entity-tag-editor";
import { useTweetTagEditor } from "~/composables/use-tweet-tag-editor";
import { useMatchBlockEditor } from "~/composables/use-match-block-editor";
import { useTableEditor } from "~/composables/use-table-editor";
import { newsSurfaceClass } from "~/utils/news-editor-layout";

const content = defineModel<string>({ required: true });

const { t } = useI18n();
const { pickerOpen, pickerKind, entityTagHandlers, insertEntityTag } = useEntityTagEditor();
const { tweetPickerOpen, tweetTagHandlers, insertTweetTag } = useTweetTagEditor();

const { matchPickerOpen, matchPickerBlock, matchBlockHandlers, applyMatchBlock } =
  useMatchBlockEditor();

const { tableHandlers, tableToolbarItems, shouldShowTableToolbar } = useTableEditor();

const editorExtensions = [
  ...tableEditorExtensions,
  ...entityTagEditorExtensions,
  TweetTagNode,
  MatchBlockNode,
];

const editorHandlers = {
  ...entityTagHandlers,
  ...tweetTagHandlers,
  ...matchBlockHandlers,
  ...tableHandlers,
};

const appendToBody = () => document.body;
const floatingMenuOptions = { strategy: "fixed" as const };

const toolbarItems: EditorToolbarItem[][] = [
  [
    {
      content: {
        align: "start",
      },
      icon: "i-lucide-heading",
      items: [
        { icon: "i-lucide-heading-1", kind: "heading", label: "Heading 1", level: 1 },
        { icon: "i-lucide-heading-2", kind: "heading", label: "Heading 2", level: 2 },
        { icon: "i-lucide-heading-3", kind: "heading", label: "Heading 3", level: 3 },
        { icon: "i-lucide-heading-4", kind: "heading", label: "Heading 4", level: 4 },
      ],
      tooltip: { text: "Headings" },
    },
  ],
  [
    { icon: "i-lucide-bold", kind: "mark", mark: "bold", tooltip: { text: "Bold" } },
    { icon: "i-lucide-italic", kind: "mark", mark: "italic", tooltip: { text: "Italic" } },
    {
      icon: "i-lucide-underline",
      kind: "mark",
      mark: "underline",
      tooltip: { text: "Underline" },
    },
    {
      icon: "i-lucide-strikethrough",
      kind: "mark",
      mark: "strike",
      tooltip: { text: "Strikethrough" },
    },
    { icon: "i-lucide-code", kind: "mark", mark: "code", tooltip: { text: "Code" } },
  ],
];

const suggestionItems = computed<EditorSuggestionMenuItem[][]>(() => [
  [
    { label: "Text", type: "label" },
    { icon: "i-lucide-type", kind: "paragraph", label: "Paragraph" },
    { icon: "i-lucide-heading-1", kind: "heading", label: "Heading 1", level: 1 },
    { icon: "i-lucide-heading-2", kind: "heading", label: "Heading 2", level: 2 },
    { icon: "i-lucide-heading-3", kind: "heading", label: "Heading 3", level: 3 },
  ],
  [
    { label: "Lists", type: "label" },
    { icon: "i-lucide-list", kind: "bulletList", label: "Bullet List" },
    { icon: "i-lucide-list-ordered", kind: "orderedList", label: "Numbered List" },
  ],
  [
    { label: "Insert", type: "label" },
    { icon: "i-lucide-text-quote", kind: "blockquote", label: "Blockquote" },
    { icon: "i-lucide-square-code", kind: "codeBlock", label: "Code Block" },
    {
      icon: "i-lucide-separator-horizontal",
      kind: "horizontalRule",
      label: "Divider",
    },
    {
      icon: "i-fluent-person-24-regular",
      kind: "playerTag",
      label: t("page.news.editor.insertPlayer"),
    },
    {
      icon: "i-fluent-people-team-24-regular",
      kind: "teamTag",
      label: t("page.news.editor.insertTeam"),
    },
    {
      icon: "i-ri-twitter-x-fill",
      kind: "tweetTag",
      label: t("page.news.editor.insertTweet"),
    },
    {
      icon: "i-fluent-trophy-24-regular",
      kind: "matchBlock",
      label: t("page.news.editor.insertMatches"),
    },
    {
      icon: "i-lucide-table",
      kind: "table",
      label: t("page.news.editor.insertTable"),
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
    :extensions="editorExtensions"
    :handlers="editorHandlers"
  >
    <UEditorToolbar
      :editor="editor"
      :items="toolbarItems"
      layout="bubble"
      :append-to="appendToBody"
      :options="floatingMenuOptions"
    />
    <UEditorToolbar
      :editor="editor"
      :items="tableToolbarItems(editor)"
      layout="bubble"
      :append-to="appendToBody"
      :options="floatingMenuOptions"
      :should-show="shouldShowTableToolbar"
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
  <NewsTweetTagPicker v-model:open="tweetPickerOpen" @select="insertTweetTag" />
  <NewsMatchBlockPicker
    v-model:open="matchPickerOpen"
    :block="matchPickerBlock"
    @select="applyMatchBlock"
  />
</template>
