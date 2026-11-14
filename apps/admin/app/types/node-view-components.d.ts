// Linters without Vue support cannot resolve .vue files, so the tiptap node views are typed here.
declare module "~/components/news/EntityTagNodeView.vue" {
  import type { NodeViewProps } from "@tiptap/vue-3";
  import type { Component } from "vue";

  const component: Component<NodeViewProps>;
  export default component;
}

declare module "~/components/news/MatchBlockNodeView.vue" {
  import type { NodeViewProps } from "@tiptap/vue-3";
  import type { Component } from "vue";

  const component: Component<NodeViewProps>;
  export default component;
}

declare module "~/components/news/TweetTagNodeView.vue" {
  import type { NodeViewProps } from "@tiptap/vue-3";
  import type { Component } from "vue";

  const component: Component<NodeViewProps>;
  export default component;
}
