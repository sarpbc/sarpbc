import { Node, mergeAttributes } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import {
  newsMatchBlockFromAttrs,
  parseNewsMatchTag,
  serializeNewsMatchTag,
  type NewsMatchBlock,
} from "@sarpbc/utils";
import MatchBlockNodeView from "~/components/news/MatchBlockNodeView.vue";
import { EMPTY_MATCH_BLOCK_ATTRS, matchBlockNodeAttrs } from "~/utils/editor/matchBlockAttrs";

export const MatchBlockNode = Node.create({
  name: "matchBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return Object.fromEntries(
      Object.keys(EMPTY_MATCH_BLOCK_ATTRS).map((name) => [name, { default: null }]),
    );
  },

  parseHTML() {
    return [{ tag: 'div[data-type="matchBlock"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "matchBlock" }, HTMLAttributes)];
  },

  addNodeView() {
    return VueNodeViewRenderer(MatchBlockNodeView);
  },

  markdownTokenName: "matchBlock",

  markdownTokenizer: {
    name: "matchBlock",
    level: "block" as const,
    start: (src: string) => {
      const block = src.indexOf("::matches{");
      if (block !== -1) {
        return block;
      }
      return src.indexOf(":matches{");
    },
    tokenize: (src: string) => {
      const parsed = parseNewsMatchTag(src.trimStart());
      if (!parsed) {
        return undefined;
      }

      const leading = src.length - src.trimStart().length;
      return {
        type: "matchBlock",
        raw: `${src.slice(0, leading)}${parsed.raw}`,
        block: parsed.block,
      };
    },
  },

  parseMarkdown: (token) => ({
    type: "matchBlock",
    attrs: matchBlockNodeAttrs(token.block as NewsMatchBlock),
  }),

  renderMarkdown: (node) => {
    const block = newsMatchBlockFromAttrs(node.attrs ?? {});
    return block ? serializeNewsMatchTag(block) : "";
  },
});
