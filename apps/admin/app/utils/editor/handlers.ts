import type { ChainedCommands, Editor } from "@tiptap/core";

export type HeadingLevel = 1 | 2 | 3 | 4;

export interface EditorCommand {
  kind: string;
  level?: HeadingLevel;
  mark?: string;
}

/** How the editor runs one kind of command; `execute` returns a chain the caller runs. */
export interface EditorHandler {
  canExecute: (editor: Editor, command: EditorCommand) => boolean;
  execute: (editor: Editor, command: EditorCommand) => ChainedCommands;
  isActive: (editor: Editor, command: EditorCommand) => boolean;
  isDisabled?: (editor: Editor, command: EditorCommand) => boolean;
}

export type EditorHandlers = Readonly<Record<string, EditorHandler>>;

const levelOf = (command: EditorCommand): HeadingLevel => command.level ?? 1;

const markOf = (command: EditorCommand): string => command.mark ?? "bold";

/* Core commands only, so these stay typed without each extension's command augmentation. */
export const DEFAULT_EDITOR_HANDLERS = {
  blockquote: {
    canExecute: (editor) => editor.can().toggleWrap("blockquote"),
    execute: (editor) => editor.chain().focus().toggleWrap("blockquote"),
    isActive: (editor) => editor.isActive("blockquote"),
  },
  bulletList: {
    canExecute: (editor) => editor.can().toggleList("bulletList", "listItem"),
    execute: (editor) => editor.chain().focus().toggleList("bulletList", "listItem"),
    isActive: (editor) => editor.isActive("bulletList"),
  },
  codeBlock: {
    canExecute: (editor) => editor.can().toggleNode("codeBlock", "paragraph"),
    execute: (editor) => editor.chain().focus().toggleNode("codeBlock", "paragraph"),
    isActive: (editor) => editor.isActive("codeBlock"),
  },
  heading: {
    canExecute: (editor, command) =>
      editor.can().toggleNode("heading", "paragraph", { level: levelOf(command) }),
    execute: (editor, command) =>
      editor
        .chain()
        .focus()
        .toggleNode("heading", "paragraph", { level: levelOf(command) }),
    isActive: (editor, command) => editor.isActive("heading", { level: levelOf(command) }),
  },
  horizontalRule: {
    canExecute: (editor) => editor.can().insertContent({ type: "horizontalRule" }),
    execute: (editor) => editor.chain().focus().insertContent({ type: "horizontalRule" }),
    isActive: () => false,
  },
  mark: {
    canExecute: (editor, command) => editor.can().toggleMark(markOf(command)),
    execute: (editor, command) => editor.chain().focus().toggleMark(markOf(command)),
    isActive: (editor, command) => editor.isActive(markOf(command)),
  },
  orderedList: {
    canExecute: (editor) => editor.can().toggleList("orderedList", "listItem"),
    execute: (editor) => editor.chain().focus().toggleList("orderedList", "listItem"),
    isActive: (editor) => editor.isActive("orderedList"),
  },
  paragraph: {
    canExecute: (editor) => editor.can().setNode("paragraph"),
    execute: (editor) => editor.chain().focus().setNode("paragraph"),
    isActive: (editor) => editor.isActive("paragraph"),
  },
} satisfies EditorHandlers;

export interface EditorToolbarItem {
  command?: EditorCommand;
  danger?: boolean;
  icon: string;
  label: string;
  onClick?: () => void;
}
