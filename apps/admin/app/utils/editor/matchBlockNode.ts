import { Node, mergeAttributes, type MarkdownTokenizer } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import { newsMatchBlockFromAttrs, parseNewsMatchTag, serializeNewsMatchTag } from "@sarpbc/utils";
import MatchBlockNodeView from "~/components/news/MatchBlockNodeView.vue";
import { EMPTY_MATCH_BLOCK_ATTRS, matchBlockNodeAttrs } from "~/utils/editor/matchBlockAttrs";

const matchBlockTokenizer: MarkdownTokenizer = {
  name: "matchBlock",
  level: "block",
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
    };
  },
};

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

  markdownTokenizer: matchBlockTokenizer,

  parseMarkdown: (token) => {
    const parsed = parseNewsMatchTag((token.raw ?? "").trimStart());
    return parsed ? { type: "matchBlock", attrs: matchBlockNodeAttrs(parsed.block) } : [];
  },

  renderMarkdown: (node) => {
    const block = newsMatchBlockFromAttrs(node.attrs ?? {});
    return block ? serializeNewsMatchTag(block) : "";
  },
});
