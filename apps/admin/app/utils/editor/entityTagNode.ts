import { Node, mergeAttributes } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import { parseNewsEntityTag, serializeNewsEntityTag, type NewsEntityTagKind } from "@sarpbc/utils";
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
      start: (src: string) => src.indexOf(`:${kind}{`),
      tokenize: (src: string) => {
        const parsed = parseNewsEntityTag(src);
        if (!parsed || parsed.kind !== kind) {
          return undefined;
        }

        return {
          type: nodeName,
          raw: parsed.raw,
          slug: parsed.slug,
          label: parsed.label,
        };
      },
    },

    parseMarkdown: (token) => ({
      type: nodeName,
      attrs: {
        slug: token.slug,
        label: token.label,
      },
    }),

    renderMarkdown: (node) =>
      serializeNewsEntityTag({
        kind,
        slug: String(node.attrs?.slug ?? ""),
        label: String(node.attrs?.label ?? ""),
      }),
  });
}

export const PlayerTagNode = createEntityTagNode("player", "playerTag");
export const TeamTagNode = createEntityTagNode("team", "teamTag");

export const entityTagEditorExtensions = [PlayerTagNode, TeamTagNode];
