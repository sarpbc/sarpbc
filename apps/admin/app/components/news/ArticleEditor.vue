<script setup lang="ts">
import { mergeAttributes } from "@tiptap/core";
import { Code } from "@tiptap/extension-code";
import { DragHandle } from "@tiptap/extension-drag-handle-vue-3";
import { HorizontalRule } from "@tiptap/extension-horizontal-rule";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { StarterKit } from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { entityTagEditorExtensions } from "~/utils/editor/entity-tag-node";
import { TweetTagNode } from "~/utils/editor/tweet-tag-node";
import { MatchBlockNode } from "~/utils/editor/match-block-node";
import { tableEditorExtensions } from "~/utils/editor/table-extensions";
import { DEFAULT_EDITOR_HANDLERS } from "~/utils/editor/handlers";
import { createSlashCommands } from "~/utils/editor/slash-commands";
import { useEntityTagEditor } from "~/composables/use-entity-tag-editor";
import { useTweetTagEditor } from "~/composables/use-tweet-tag-editor";
import { useMatchBlockEditor } from "~/composables/use-match-block-editor";
import { useTableEditor } from "~/composables/use-table-editor";
import { newsSurfaceClass } from "~/utils/news-editor-layout";
import SlashMenu from "~/components/news/SlashMenu.vue";
import type { EditorHandlers, EditorToolbarItem, HeadingLevel } from "~/utils/editor/handlers";
import type { SlashGroup, SlashItem } from "~/utils/editor/slash-commands";
import type { Editor } from "@tiptap/core";

const content = defineModel<string>({ required: true });

const { t } = useI18n();
const { pickerOpen, pickerKind, entityTagHandlers, insertEntityTag } = useEntityTagEditor();
const { tweetPickerOpen, tweetTagHandlers, insertTweetTag } = useTweetTagEditor();

const { matchPickerOpen, matchPickerBlock, matchBlockHandlers, applyMatchBlock } =
  useMatchBlockEditor();

const { tableHandlers, tableToolbarItems, shouldShowTableToolbar } = useTableEditor();

const handlers: EditorHandlers = {
  ...DEFAULT_EDITOR_HANDLERS,
  ...entityTagHandlers,
  ...tweetTagHandlers,
  ...matchBlockHandlers,
  ...tableHandlers,
};

const HEADING_LEVELS: readonly HeadingLevel[] = [1, 2, 3, 4];

const toolbarItems = computed((): EditorToolbarItem[][] => [
  HEADING_LEVELS.map((level) => ({
    command: { kind: "heading", level },
    icon: `i-lucide-heading-${level}`,
    label: t("page.news.editor.heading", { level }),
  })),
  [
    {
      command: { kind: "mark", mark: "bold" },
      icon: "i-lucide-bold",
      label: t("page.news.editor.bold"),
    },
    {
      command: { kind: "mark", mark: "italic" },
      icon: "i-lucide-italic",
      label: t("page.news.editor.italic"),
    },
    {
      command: { kind: "mark", mark: "underline" },
      icon: "i-lucide-underline",
      label: t("page.news.editor.underline"),
    },
    {
      command: { kind: "mark", mark: "strike" },
      icon: "i-lucide-strikethrough",
      label: t("page.news.editor.strike"),
    },
    {
      command: { kind: "mark", mark: "code" },
      icon: "i-lucide-code",
      label: t("page.news.editor.code"),
    },
  ],
]);

const slashGroups = (): SlashGroup[] => [
  {
    items: [
      { icon: "i-lucide-type", kind: "paragraph", label: t("page.news.editor.paragraph") },
      ...HEADING_LEVELS.slice(0, 3).map((level) => ({
        icon: `i-lucide-heading-${level}`,
        kind: "heading",
        label: t("page.news.editor.heading", { level }),
        level,
      })),
    ],
    label: t("page.news.editor.text"),
  },
  {
    items: [
      { icon: "i-lucide-list", kind: "bulletList", label: t("page.news.editor.bulletList") },
      {
        icon: "i-lucide-list-ordered",
        kind: "orderedList",
        label: t("page.news.editor.orderedList"),
      },
    ],
    label: t("page.news.editor.lists"),
  },
  {
    items: [
      { icon: "i-lucide-text-quote", kind: "blockquote", label: t("page.news.editor.blockquote") },
      { icon: "i-lucide-square-code", kind: "codeBlock", label: t("page.news.editor.codeBlock") },
      {
        icon: "i-lucide-separator-horizontal",
        kind: "horizontalRule",
        label: t("page.news.editor.divider"),
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
      { icon: "i-ri-twitter-x-fill", kind: "tweetTag", label: t("page.news.editor.insertTweet") },
      {
        icon: "i-fluent-trophy-24-regular",
        kind: "matchBlock",
        label: t("page.news.editor.insertMatches"),
      },
      { icon: "i-lucide-table", kind: "table", label: t("page.news.editor.insertTable") },
    ],
    label: t("page.news.editor.insert"),
  },
];

const runSlashItem = (editor: Editor, item: SlashItem): void => {
  handlers[item.kind]?.execute(editor, item).run();
};

const editor = useEditor({
  content: content.value,
  contentType: "markdown",
  editorProps: {
    attributes: {
      autocapitalize: "off",
      autocomplete: "off",
      autocorrect: "off",
      class: "article-editor__base",
    },
  },
  extensions: [
    Markdown.configure({ markedOptions: { gfm: true } }),
    StarterKit.configure({
      code: false,
      dropcursor: { color: "var(--sb-primary)", width: 2 },
      horizontalRule: false,
      link: { openOnClick: false },
    }),
    Code.extend({ excludes: "code" }),
    // Wrapping the rule gives it room to be selected and dragged.
    HorizontalRule.extend({
      renderHTML() {
        return [
          "div",
          mergeAttributes(this.options.HTMLAttributes, { "data-type": this.name }),
          ["hr"],
        ];
      },
    }),
    Image,
    Placeholder.configure({
      placeholder: t("page.news.create.placeholder"),
      showOnlyCurrent: true,
      showOnlyWhenEditable: false,
    }),
    createSlashCommands({ groups: slashGroups, menu: SlashMenu, run: runSlashItem }),
    ...tableEditorExtensions,
    ...entityTagEditorExtensions,
    TweetTagNode,
    MatchBlockNode,
  ],
  onUpdate: ({ editor: current, transaction }) => {
    if (transaction.docChanged) {
      content.value = current.getMarkdown();
    }
  },
});

/* Outside changes (a loaded draft, a language switch) replace the document; typing does not. */
watch(content, (value) => {
  const current = editor.value;

  if (!current || current.getMarkdown() === value) {
    return;
  }

  current.commands.setContent(value, { contentType: "markdown" });
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<template>
  <div :class="[newsSurfaceClass, 'article-editor h-full flex-1']">
    <template v-if="editor">
      <NewsEditorToolbar :editor="editor" :handlers="handlers" :items="toolbarItems" />
      <NewsEditorToolbar
        :editor="editor"
        :handlers="handlers"
        :items="tableToolbarItems(editor)"
        :should-show="shouldShowTableToolbar"
      />
      <DragHandle :editor="editor" class="article-editor__handle">
        <Icon name="i-fluent-re-order-dots-vertical-24-regular" class="size-4" />
      </DragHandle>
      <EditorContent :editor="editor" class="relative size-full flex-1" />
    </template>
  </div>

  <NewsEntityTagPicker v-model:open="pickerOpen" :kind="pickerKind" @select="insertEntityTag" />
  <NewsTweetTagPicker v-model:open="tweetPickerOpen" @select="insertTweetTag" />
  <NewsMatchBlockPicker
    v-model:open="matchPickerOpen"
    :block="matchPickerBlock"
    @select="applyMatchBlock"
  />
</template>

<style scoped>
/* The article body while editing: the same typography Nuxt UI's editor gave it. */
.article-editor :deep(.article-editor__base) {
  width: 100%;
  outline: none;
}

@media (width >= 40rem) {
  .article-editor :deep(.article-editor__base) {
    padding-inline: 1rem;
  }
}

.article-editor :deep(.article-editor__base > *) {
  margin-block: 1.25rem;
}

.article-editor :deep(.article-editor__base > :first-child) {
  margin-top: 0;
}

.article-editor :deep(.article-editor__base > :last-child) {
  margin-bottom: 0;
}

.article-editor :deep(::selection) {
  background: color-mix(in oklab, var(--sb-primary) 20%, transparent);
}

.article-editor :deep(p) {
  line-height: 1.75rem;
}

.article-editor :deep(a) {
  color: var(--sb-primary);
  font-weight: 500;
}

.article-editor :deep(:is(h1, h2, h3, h4, h5, h6)) {
  color: var(--sb-text-highlighted);
  font-weight: 700;
}

.article-editor :deep(h1) {
  font-size: 1.875rem;
}

.article-editor :deep(h2) {
  font-size: 1.5rem;
}

.article-editor :deep(h3) {
  font-size: 1.25rem;
}

.article-editor :deep(h4) {
  font-size: 1.125rem;
}

.article-editor :deep(blockquote) {
  padding-inline-start: 1rem;
  border-inline-start: 4px solid var(--sb-border-accented);
  font-style: italic;
}

.article-editor :deep([data-type="horizontalRule"]) {
  margin-block: 2rem;
  padding-block: 0.5rem;
}

.article-editor :deep(hr) {
  border: 0;
  border-top: 1px solid var(--sb-border);
}

.article-editor :deep(pre) {
  overflow-x: auto;
  padding: 0.75rem 1rem;
  background: var(--sb-bg-muted);
  box-shadow: inset 0 0 0 1px var(--sb-border);
  font-size: 0.875rem;
  line-height: 1.5rem;
  white-space: pre-wrap;
}

.article-editor :deep(code) {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  background: var(--sb-bg-muted);
  box-shadow: inset 0 0 0 1px var(--sb-border);
  color: var(--sb-text-highlighted);
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
  font-weight: 500;
}

.article-editor :deep(pre code) {
  display: inline;
  padding: 0;
  background: none;
  box-shadow: none;
  color: inherit;
}

.article-editor :deep(:is(ul, ol)) {
  padding-inline-start: 1.5rem;
}

.article-editor :deep(ul) {
  list-style: disc;
}

.article-editor :deep(ol) {
  list-style: decimal;
}

.article-editor :deep(li) {
  margin-block: 0.375rem;
  padding-inline-start: 0.375rem;
}

.article-editor :deep(img) {
  display: block;
  max-width: 100%;
}

.article-editor :deep(img.ProseMirror-selectednode) {
  outline: 2px solid var(--sb-primary);
}

.article-editor :deep(.ProseMirror-selectednode:not(img):not(pre):not([data-node-view-wrapper])) {
  background: color-mix(in oklab, var(--sb-primary) 20%, transparent);
}

.article-editor :deep(:is(p, h1, h2, h3, h4, h5, h6).is-empty::before) {
  float: inline-start;
  height: 0;
  color: var(--sb-text-dimmed);
  content: attr(data-placeholder);
  pointer-events: none;
}

.article-editor__handle {
  display: flex;
  align-items: center;
  color: var(--sb-text-dimmed);
  cursor: grab;
}
</style>
