import { Node, mergeAttributes } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import { newsTweetTagStart, parseNewsTweetTag, serializeNewsTweetTag } from "@sarpbc/utils";
import TweetTagNodeView from "~/components/news/TweetTagNodeView.vue";

export const TweetTagNode = Node.create({
  addAttributes() {
    return {
      url: { default: null },
    };
  },
  addNodeView() {
    return VueNodeViewRenderer(TweetTagNodeView);
  },
  atom: true,
  draggable: true,
  group: "block",
  markdownTokenName: "tweetTag",
  markdownTokenizer: {
    level: "block" as const,
    name: "tweetTag",
    start: newsTweetTagStart,
    tokenize: (src: string) => {
      const parsed = parseNewsTweetTag(src.trimStart());

      const leading = src.length - src.trimStart().length;

      return parsed
        ? { raw: `${src.slice(0, leading)}${parsed.raw}`, type: "tweetTag", url: parsed.url }
        : undefined;
    },
  },
  name: "tweetTag",
  parseHTML() {
    return [{ tag: 'div[data-type="tweetTag"]' }];
  },
  parseMarkdown: (token) => {
    const parsed = parseNewsTweetTag((token.raw ?? "").trimStart());

    return parsed ? { attrs: { url: parsed.url }, type: "tweetTag" } : [];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "tweetTag" }, HTMLAttributes)];
  },
  renderMarkdown: (node) => serializeNewsTweetTag(String(node.attrs?.url ?? "")),
});
