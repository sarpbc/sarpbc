<script setup lang="ts">
import { NodeViewWrapper } from "@tiptap/vue-3";
import type { NodeViewProps } from "@tiptap/vue-3";
import { newsMatchBlockFromAttrs } from "@sarpbc/utils";
import { useMatchBlockEditor } from "~/composables/useMatchBlockEditor";
import { matchBlockNodeAttrs } from "~/utils/editor/matchBlockAttrs";

const props = defineProps<NodeViewProps>();

const { t } = useI18n();
const { editMatchBlock } = useMatchBlockEditor();

const block = computed(() => newsMatchBlockFromAttrs(props.node.attrs));

function edit() {
  editMatchBlock(block.value, (next) => props.updateAttributes(matchBlockNodeAttrs(next)));
}
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="my-3 flex flex-col gap-2"
    :class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-default': props.selected }"
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
        @click="props.deleteNode()"
      />
    </div>
    <NewsMatchBlockPreview v-bind="props.node.attrs" />
  </NodeViewWrapper>
</template>
