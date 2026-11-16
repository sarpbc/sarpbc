<script setup lang="ts">
import { BubbleMenu } from "@tiptap/vue-3/menus";

import type { EditorHandlers, EditorToolbarItem } from "~/utils/editor/handlers";
import type { Editor } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

const {
  editor,
  handlers,
  items,
  shouldShow = null,
} = defineProps<{
  editor: Editor;
  handlers: EditorHandlers;
  items: readonly (readonly EditorToolbarItem[])[];
  shouldShow?:
    | ((props: { editor: Editor; state: EditorState; view: EditorView }) => boolean)
    | null;
}>();

const isActive = (item: EditorToolbarItem): boolean => {
  if (item.command === undefined) {
    return false;
  }

  return handlers[item.command.kind]?.isActive(editor, item.command) ?? false;
};

const isDisabled = (item: EditorToolbarItem): boolean => {
  if (item.command === undefined) {
    return false;
  }

  const handler = handlers[item.command.kind];

  if (handler === undefined) {
    return true;
  }

  return (
    (handler.isDisabled?.(editor, item.command) ?? false) ||
    !handler.canExecute(editor, item.command)
  );
};

const run = (item: EditorToolbarItem): void => {
  if (item.onClick !== undefined) {
    item.onClick();

    return;
  }

  if (item.command !== undefined) {
    handlers[item.command.kind]?.execute(editor, item.command).run();
  }
};

/* Menus float above the page, so they must not be clipped by the editor's scroll container. */
const appendToBody = (): HTMLElement => document.body;
</script>

<template>
  <BubbleMenu
    :editor="editor"
    :should-show="shouldShow ?? undefined"
    :append-to="appendToBody"
    :options="{ strategy: 'fixed' }"
    class="editor-toolbar"
  >
    <template v-for="(group, index) in items" :key="index">
      <span v-if="index > 0" class="editor-toolbar__divider" aria-hidden="true" />
      <STooltip v-for="item in group" :key="item.label" :text="item.label">
        <SButton
          variant="tertiary"
          size="sm"
          :icon="item.icon"
          :danger="item.danger === true"
          :aria-label="item.label"
          :aria-pressed="item.command === undefined ? undefined : isActive(item)"
          :disabled="isDisabled(item)"
          :class="{ 'editor-toolbar__button--active': isActive(item) }"
          @mousedown.prevent
          @click="run(item)"
        />
      </STooltip>
    </template>
  </BubbleMenu>
</template>

<style scoped>
.editor-toolbar {
  z-index: 60;
  display: flex;
  gap: 0.125rem;
  align-items: center;
  padding: 0.25rem;
  background: var(--sb-bg);
  box-shadow:
    inset 0 0 0 1px var(--sb-border),
    0 4px 12px rgb(0 0 0 / 0.12);
}

.editor-toolbar__divider {
  width: 1px;
  height: 1rem;
  margin: 0 0.25rem;
  background: var(--sb-border);
}

.editor-toolbar__button--active {
  background: var(--sb-bg-elevated);
  color: var(--sb-text-highlighted);
}
</style>
