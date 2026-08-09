<script lang="ts" setup>
import type { Comment, CommentTargetType } from "~/types/discussion";
import { commentAnchorId } from "~/utils/commentPermalink";

const {
  comment,
  targetType,
  targetId,
  depth = 0,
} = defineProps<{
  comment: Comment;
  targetType: CommentTargetType;
  targetId: string;
  depth?: number;
}>();

const emit = defineEmits<{
  changed: [];
}>();

const { t, locale } = useI18n();
const user = useUser();
const toast = useToast();
const displayReply = ref(false);
const isModerating = ref(false);
const canModerate = computed(() => canModerateComments(user.value));

const permalink = inject<{
  highlightedCommentId: Ref<string | null>;
  navigateToComment: (commentId: string) => void;
}>("commentPermalink");

const authorLabel = computed(() => comment.author.userName);
const anchorId = computed(() => commentAnchorId(comment.id));
const isHighlighted = computed(() => permalink?.highlightedCommentId.value === comment.id);

function onCommentCreated() {
  displayReply.value = false;
  emit("changed");
}

function onPermalinkClick() {
  permalink?.navigateToComment(comment.id);
}

async function onHide() {
  isModerating.value = true;
  const ok = await hideComment(comment.id);
  isModerating.value = false;
  if (ok) {
    toast.add({ title: t("components.discussion.messages.hidden"), color: "success" });
    emit("changed");
    return;
  }
  toast.add({
    title: t("components.discussion.messages.errorTitle"),
    description: t("components.discussion.messages.moderateError"),
    color: "error",
  });
}

async function onDelete() {
  isModerating.value = true;
  const ok = await deleteComment(comment.id);
  isModerating.value = false;
  if (ok) {
    toast.add({ title: t("components.discussion.messages.deleted"), color: "success" });
    emit("changed");
    return;
  }
  toast.add({
    title: t("components.discussion.messages.errorTitle"),
    description: t("components.discussion.messages.moderateError"),
    color: "error",
  });
}
</script>

<template>
  <article
    :id="anchorId"
    class="w-full flex flex-col gap-3 scroll-mt-24 outline-none rounded-sm"
    :class="{ 'comment-highlight': isHighlighted }"
    :aria-label="authorLabel"
  >
    <div class="border border-default rounded-sm">
      <div class="flex flex-row items-center justify-between border-b border-default px-4 h-8">
        <span class="font-medium text-muted text-sm" translate="no">
          {{ authorLabel }}
        </span>
        <span class="font-light text-muted text-sm tabular-nums">
          {{ df(locale).format(new Date(comment.createdAt)) }}
        </span>
      </div>
      <div class="text-toned whitespace-pre-wrap leading-relaxed p-4 text-pretty">
        {{ comment.content }}
      </div>
      <div
        class="flex flex-row items-center justify-between gap-2 border-t border-default px-4 py-1.5"
      >
        <div class="flex flex-row items-center gap-1">
          <ForumSignInPrompt action="reply">
            <UButton
              size="sm"
              variant="soft"
              :label="$t('components.discussion.reply')"
              icon="i-fluent-arrow-reply-24-regular"
              class="p-1! gap-1! cursor-pointer min-h-6 min-w-6"
              @click="displayReply = !displayReply"
            />
          </ForumSignInPrompt>
          <UButton
            size="sm"
            variant="ghost"
            color="neutral"
            icon="i-fluent-link-24-regular"
            class="p-1! min-h-6 min-w-6 cursor-pointer"
            :aria-label="$t('components.discussion.permalink')"
            @click="onPermalinkClick"
          />
        </div>
        <div v-if="canModerate" class="flex flex-row items-center gap-1">
          <UButton
            size="sm"
            variant="ghost"
            color="neutral"
            :label="$t('components.discussion.hide')"
            :loading="isModerating"
            :disabled="isModerating"
            class="cursor-pointer"
            @click="onHide"
          />
          <UButton
            size="sm"
            variant="ghost"
            color="error"
            :label="$t('components.discussion.delete')"
            :loading="isModerating"
            :disabled="isModerating"
            class="cursor-pointer"
            @click="onDelete"
          />
        </div>
      </div>
    </div>

    <div v-if="displayReply && user" class="pl-4 md:pl-6">
      <DiscussionCommentComposer
        :target-type="targetType"
        :target-id="targetId"
        :reply-to-id="comment.id"
        autofocus
        @comment-created="onCommentCreated"
      />
    </div>

    <div
      v-if="comment.replies?.length"
      class="flex flex-col gap-3 pl-4 md:pl-6 border-l border-default"
    >
      <DiscussionCommentItem
        v-for="child in comment.replies"
        :key="child.id"
        :comment="child"
        :target-type="targetType"
        :target-id="targetId"
        :depth="depth + 1"
        @changed="emit('changed')"
      />
    </div>
  </article>
</template>

<style scoped>
.comment-highlight {
  animation: comment-highlight 2s ease-out;
}

@keyframes comment-highlight {
  0%,
  15% {
    background-color: color-mix(in srgb, var(--ui-color-primary-500) 18%, transparent);
  }

  100% {
    background-color: transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .comment-highlight {
    animation: none;
    background-color: color-mix(in srgb, var(--ui-color-primary-500) 12%, transparent);
  }
}
</style>
