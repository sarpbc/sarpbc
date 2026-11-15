import type { Editor } from "@tiptap/core";
import type { EditorToolbarItem } from "~/utils/editor/handlers";

const DEFAULT_TABLE = { cols: 3, rows: 3, withHeaderRow: true } as const;

const shouldShowTableToolbar = ({
  editor,
  view,
}: {
  editor: Editor;
  view: { hasFocus: () => boolean };
}) => editor.isActive("table") && view.hasFocus();

export const useTableEditor = () => {
  const { t } = useI18n();

  const tableHandlers = {
    table: {
      canExecute: (editor: Editor) => editor.can().insertTable(DEFAULT_TABLE),
      execute: (editor: Editor) => editor.chain().focus().insertTable(DEFAULT_TABLE),
      isActive: (editor: Editor) => editor.isActive("table"),
      isDisabled: (editor: Editor) => !editor.can().insertTable(DEFAULT_TABLE),
    },
  };

  const tableToolbarItems = (editor: Editor): EditorToolbarItem[][] => [
    [
      {
        icon: "i-lucide-arrow-up-to-line",
        label: t("page.news.editor.tableAddRowBefore"),
        onClick: () => {
          editor.chain().focus().addRowBefore().run();
        },
      },
      {
        icon: "i-lucide-arrow-down-to-line",
        label: t("page.news.editor.tableAddRowAfter"),
        onClick: () => {
          editor.chain().focus().addRowAfter().run();
        },
      },
      {
        icon: "i-lucide-trash-2",
        label: t("page.news.editor.tableDeleteRow"),
        onClick: () => {
          editor.chain().focus().deleteRow().run();
        },
      },
    ],
    [
      {
        icon: "i-lucide-arrow-left-to-line",
        label: t("page.news.editor.tableAddColumnBefore"),
        onClick: () => {
          editor.chain().focus().addColumnBefore().run();
        },
      },
      {
        icon: "i-lucide-arrow-right-to-line",
        label: t("page.news.editor.tableAddColumnAfter"),
        onClick: () => {
          editor.chain().focus().addColumnAfter().run();
        },
      },
      {
        icon: "i-lucide-trash-2",
        label: t("page.news.editor.tableDeleteColumn"),
        onClick: () => {
          editor.chain().focus().deleteColumn().run();
        },
      },
    ],
    [
      {
        danger: true,
        icon: "i-lucide-table-2",
        label: t("page.news.editor.tableDeleteTable"),
        onClick: () => {
          editor.chain().focus().deleteTable().run();
        },
      },
    ],
  ];

  return {
    shouldShowTableToolbar,
    tableHandlers,
    tableToolbarItems,
  };
};
