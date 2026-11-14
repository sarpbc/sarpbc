import { Node, mergeAttributes } from "@tiptap/core";
import type { MarkdownTokenizer } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import {
  newsMatchBlockFromAttrs,
  newsMatchTagStart,
  parseNewsMatchTag,
  serializeNewsMatchTag,
} from "@sarpbc/utils";
import MatchBlockNodeView from "~/components/news/MatchBlockNodeView.vue";
import { EMPTY_MATCH_BLOCK_ATTRS, matchBlockNodeAttrs } from "~/utils/editor/match-block-attrs";

const matchBlockTokenizer: MarkdownTokenizer = {
  level: "block",
  name: "matchBlock",
  start: newsMatchTagStart,
  tokenize: (src: string) => {
    const parsed = parseNewsMatchTag(src.trimStart());

    const leading = src.length - src.trimStart().length;

    return parsed
      ? { raw: `${src.slice(0, leading)}${parsed.raw}`, type: "matchBlock" }
      : undefined;
  },
};

export const MatchBlockNode = Node.create({
  addAttributes() {
    return Object.fromEntries(
      Object.keys(EMPTY_MATCH_BLOCK_ATTRS).map((name) => [name, { default: null }]),
    );
  },
  addNodeView() {
    return VueNodeViewRenderer(MatchBlockNodeView);
  },
  atom: true,
  draggable: true,
  group: "block",
  markdownTokenName: "matchBlock",
  markdownTokenizer: matchBlockTokenizer,
  name: "matchBlock",
  parseHTML() {
    return [{ tag: 'div[data-type="matchBlock"]' }];
  },
  parseMarkdown: (token) => {
    const parsed = parseNewsMatchTag((token.raw ?? "").trimStart());

    return parsed ? { attrs: matchBlockNodeAttrs(parsed.block), type: "matchBlock" } : [];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "matchBlock" }, HTMLAttributes)];
  },
  renderMarkdown: (node) => {
    const block = newsMatchBlockFromAttrs(node.attrs ?? {});

    return block ? serializeNewsMatchTag(block) : "";
  },
});
