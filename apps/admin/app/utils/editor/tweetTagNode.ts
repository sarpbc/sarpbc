import { Node, mergeAttributes } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import { parseNewsTweetTag, serializeNewsTweetTag } from "@sarpbc/utils";
import TweetTagNodeView from "~/components/news/TweetTagNodeView.vue";

export const TweetTagNode = Node.create({
  name: "tweetTag",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="tweetTag"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "tweetTag" }, HTMLAttributes)];
  },

  addNodeView() {
    return VueNodeViewRenderer(TweetTagNodeView);
  },

  markdownTokenName: "tweetTag",

  markdownTokenizer: {
    name: "tweetTag",
    level: "block" as const,
    start: (src: string) => {
      const block = src.indexOf("::tweet{");
      if (block !== -1) {
        return block;
      }
      return src.indexOf(":tweet{");
    },
    tokenize: (src: string) => {
      const parsed = parseNewsTweetTag(src.trimStart());
      if (!parsed) {
        return undefined;
      }

      const leading = src.length - src.trimStart().length;
      return {
        type: "tweetTag",
        raw: `${src.slice(0, leading)}${parsed.raw}`,
        url: parsed.url,
      };
    },
  },

  parseMarkdown: (token) => ({
    type: "tweetTag",
    attrs: {
      url: token.url,
    },
  }),

  renderMarkdown: (node) => serializeNewsTweetTag(String(node.attrs?.url ?? "")),
});
