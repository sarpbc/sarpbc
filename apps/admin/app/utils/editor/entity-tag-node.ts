import { Node, mergeAttributes } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import { newsEntityTagStart, parseNewsEntityTag, serializeNewsEntityTag } from "@sarpbc/utils";
import type { NewsEntityTagKind } from "@sarpbc/utils";
import EntityTagNodeView from "~/components/news/EntityTagNodeView.vue";

const createEntityTagNode = (kind: NewsEntityTagKind, nodeName: string) =>
  Node.create({
    addAttributes() {
      return {
        label: { default: null },
        slug: { default: null },
      };
    },
    addNodeView() {
      return VueNodeViewRenderer(EntityTagNodeView);
    },
    atom: true,
    draggable: true,
    group: "inline",
    inline: true,
    markdownTokenName: nodeName,
    markdownTokenizer: {
      level: "inline" as const,
      name: nodeName,
      start: (src: string) => newsEntityTagStart(src, kind),
      tokenize: (src: string) => {
        const parsed = parseNewsEntityTag(src);

        return parsed?.kind === kind
          ? { label: parsed.label, raw: parsed.raw, slug: parsed.slug, type: nodeName }
          : undefined;
      },
    },
    name: nodeName,
    parseHTML() {
      return [{ tag: `span[data-type="${nodeName}"]` }];
    },
    parseMarkdown: (token) => {
      const parsed = parseNewsEntityTag(token.raw ?? "");

      return parsed ? { attrs: { label: parsed.label, slug: parsed.slug }, type: nodeName } : [];
    },
    renderHTML({ HTMLAttributes }) {
      return ["span", mergeAttributes({ "data-type": nodeName }, HTMLAttributes)];
    },
    renderMarkdown: (node) =>
      serializeNewsEntityTag({
        kind,
        label: String(node.attrs?.label ?? ""),
        slug: String(node.attrs?.slug ?? ""),
      }),
  });

const PlayerTagNode = createEntityTagNode("player", "playerTag");
const TeamTagNode = createEntityTagNode("team", "teamTag");

export const entityTagEditorExtensions = [PlayerTagNode, TeamTagNode];
