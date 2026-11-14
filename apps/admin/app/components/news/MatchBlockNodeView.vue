<script setup lang="ts">
import { NodeViewWrapper } from "@tiptap/vue-3";
import type { NodeViewProps } from "@tiptap/vue-3";
import { newsMatchBlockFromAttrs } from "@sarpbc/utils";
import { matchBlockNodeAttrs } from "~/utils/editor/match-block-attrs";

const { node, updateAttributes, selected, deleteNode } = defineProps<NodeViewProps>();

const { t } = useI18n();
const editMatchBlock = useEditMatchBlock();

const block = computed(() => newsMatchBlockFromAttrs(node.attrs));

function edit() {
  editMatchBlock(block.value, (next) => updateAttributes(matchBlockNodeAttrs(next)));
}
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="my-3 flex flex-col gap-2"
    :class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-default': selected }"
    contenteditable="false"
    data-drag-handle
  >
    <div class="flex items-center justify-end gap-1">
      <UButton
        size="xs"
        color="neutral"
        variant="subtle"
        icon="i-lucide-pencil"
        :label="t('page.news.editor.matches.edit')"
        @click="edit"
      />
      <UButton
        size="xs"
        color="error"
        variant="subtle"
        icon="i-lucide-trash-2"
        :label="t('page.news.editor.matches.remove')"
        @click="deleteNode()"
      />
    </div>
    <NewsMatchBlockPreview v-bind="node.attrs" />
  </NodeViewWrapper>
</template>
