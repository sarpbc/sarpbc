import { Node, mergeAttributes } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import {
  newsEntityTagStart,
  parseNewsEntityTag,
  serializeNewsEntityTag,
  type NewsEntityTagKind,
} from "@sarpbc/utils";
import EntityTagNodeView from "~/components/news/EntityTagNodeView.vue";

function createEntityTagNode(kind: NewsEntityTagKind, nodeName: string) {
  return Node.create({
    name: nodeName,
    group: "inline",
    inline: true,
    atom: true,
    draggable: true,

    addAttributes() {
      return {
        slug: { default: null },
        label: { default: null },
      };
    },

    parseHTML() {
      return [{ tag: `span[data-type="${nodeName}"]` }];
    },

    renderHTML({ HTMLAttributes }) {
      return ["span", mergeAttributes({ "data-type": nodeName }, HTMLAttributes)];
    },

    addNodeView() {
      return VueNodeViewRenderer(EntityTagNodeView);
    },

    markdownTokenName: nodeName,

    markdownTokenizer: {
      name: nodeName,
      level: "inline" as const,
      start: (src: string) => newsEntityTagStart(src, kind),
      tokenize: (src: string) => {
        const parsed = parseNewsEntityTag(src);

        return parsed?.kind === kind
          ? { type: nodeName, raw: parsed.raw, slug: parsed.slug, label: parsed.label }
          : undefined;
      },
    },

    parseMarkdown: (token) => {
      const parsed = parseNewsEntityTag(token.raw ?? "");

      return parsed ? { type: nodeName, attrs: { slug: parsed.slug, label: parsed.label } } : [];
    },

    renderMarkdown: (node) =>
      serializeNewsEntityTag({
        kind,
        slug: String(node.attrs?.slug ?? ""),
        label: String(node.attrs?.label ?? ""),
      }),
  });
}

const PlayerTagNode = createEntityTagNode("player", "playerTag");
const TeamTagNode = createEntityTagNode("team", "teamTag");

export const entityTagEditorExtensions = [PlayerTagNode, TeamTagNode];
