import { TableKit } from "@tiptap/extension-table";

export const tableEditorExtensions = [
  TableKit.configure({
    table: { resizable: true },
  }),
];
