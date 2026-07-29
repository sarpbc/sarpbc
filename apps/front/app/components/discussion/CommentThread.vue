<script lang="ts" setup>
import type { Comment, CommentTargetType } from "~/types/discussion";

const { targetType, targetId } = defineProps<{
  targetType: CommentTargetType;
  targetId: string;
}>();

const { t } = useI18n();

const {
  data: comments,
  pending,
  error,
  refresh,
} = await useAsyncData<Comment[]>(
  () => `comments-${targetType}-${targetId}`,
  () => getCommentsByTarget(targetType, targetId),
  {
    watch: [() => targetType, () => targetId],
    default: () => [],
  },
);

async function onChanged() {
  await refresh();
}

const hasComments = computed(() => (comments.value?.length ?? 0) > 0);
</script>

<template>
  <section
    class="w-full flex flex-col gap-4"
    :aria-labelledby="hasComments ? 'discussion-heading' : undefined"
  >
    <div v-if="hasComments" class="flex flex-col gap-1">
      <h2 id="discussion-heading" class="text-sm font-medium text-toned pl-1">
        {{ t("components.discussion.heading") }}
      </h2>
      <p class="text-sm text-muted pl-1">
        {{ t("components.discussion.subtitle") }}
      </p>
    </div>

    <div class="border border-default rounded-sm p-4">
      <DiscussionCommentComposer
        :target-type="targetType"
        :target-id="targetId"
        @comment-created="onChanged"
      />
    </div>

    <div v-if="pending" class="flex flex-col gap-3" aria-live="polite">
      <div
        v-for="n in 3"
        :key="n"
        class="h-24 rounded-sm border border-default bg-elevated/40 animate-pulse"
      />
    </div>

    <div
      v-else-if="error"
      class="flex flex-col items-center gap-3 py-8 px-4 text-center border border-default rounded-sm"
    >
      <p class="text-sm text-muted">
        {{ t("components.discussion.error") }}
      </p>
      <UButton variant="outline" @click="refresh()">
        {{ t("components.discussion.retry") }}
      </UButton>
    </div>

    <div v-else-if="hasComments" class="flex flex-col gap-4">
      <DiscussionCommentItem
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :target-type="targetType"
        :target-id="targetId"
        @changed="onChanged"
      />
    </div>
  </section>
</template>
