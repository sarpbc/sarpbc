<script setup lang="ts">
import { NodeViewWrapper } from "@tiptap/vue-3";
import type { NodeViewProps } from "@tiptap/vue-3";

const props = defineProps<NodeViewProps>();

const url = computed(() => String(props.node.attrs.url ?? ""));
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="my-3"
    :class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-default': props.selected }"
    contenteditable="false"
    data-drag-handle
  >
    <SarpTweetTag :url="url" />
  </NodeViewWrapper>
</template>
