<script setup lang="ts">
import { NodeViewWrapper } from "@tiptap/vue-3";
import type { NodeViewProps } from "@tiptap/vue-3";

const props = defineProps<NodeViewProps>();

const kind = computed(() => (props.node.type.name === "teamTag" ? "team" : "player"));
const label = computed(() => String(props.node.attrs.label ?? ""));
const icon = computed(() =>
  kind.value === "team" ? "i-fluent-people-team-24-regular" : "i-fluent-person-24-regular",
);
</script>

<template>
  <NodeViewWrapper as="span" class="inline">
    <span
      class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-sm font-medium text-primary"
      :class="{ 'ring-2 ring-primary': props.selected }"
      contenteditable="false"
      translate="no"
      data-drag-handle
    >
      <UIcon :name="icon" class="size-3.5 shrink-0" />
      @{{ label }}
    </span>
  </NodeViewWrapper>
</template>
