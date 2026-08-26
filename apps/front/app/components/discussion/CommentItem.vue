<script lang="ts" setup>
import type { Comment, CommentTargetType } from "~/types/discussion";
import { commentAnchorId } from "~/utils/commentPermalink";

const { comment, targetType, targetId } = defineProps<{
  comment: Comment;
  targetType: CommentTargetType;
  targetId: string;
}>();

const emit = defineEmits<{
  changed: [];
}>();

const { t, locale } = useI18n();
const user = useUser();
const toast = useToast();
const displayReply = ref(false);
const displayReport = ref(false);
const menuOpen = ref(false);
const isModerating = ref(false);
const canModerate = computed(() => canModerateComments(user.value));
const canReport = computed(() => !!user.value && user.value.id !== comment.author.id);

const permalink = inject<{
  highlightedCommentId: Ref<string | null>;
  navigateToComment: (commentId: string) => void;
}>("commentPermalink");

const authorLabel = computed(() => comment.author.userName);
const anchorId = computed(() => commentAnchorId(comment.id));
const isHighlighted = computed(() => permalink?.highlightedCommentId.value === comment.id);
const menuId = computed(() => `comment-menu-${comment.id}`);
const replies = computed(() => comment.replies ?? []);
const hasReplies = computed(() => replies.value.length > 0);
const lastReplyIndex = computed(() => replies.value.length - 1);

function onCommentCreated() {
  displayReply.value = false;
  emit("changed");
}

function onPermalinkClick() {
  menuOpen.value = false;
  permalink?.navigateToComment(comment.id);
}

function onReportClick() {
  menuOpen.value = false;
  displayReport.value = true;
}

async function onHide() {
  menuOpen.value = false;
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
  menuOpen.value = false;
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
    class="w-full flex flex-col scroll-mt-24 outline-none"
    :class="{ 'comment-highlight': isHighlighted }"
    :aria-label="authorLabel"
  >
    <div class="flex flex-col">
      <div class="flex h-row-compact min-h-row-compact items-center justify-between gap-2 px-3">
        <span class="truncate font-medium text-sm text-muted" translate="no">
          {{ authorLabel }}
        </span>
        <span class="shrink-0 text-xs text-muted tabular-nums">
          {{ df(locale).format(new Date(comment.createdAt)) }}
        </span>
      </div>

      <div class="text-toned whitespace-pre-wrap leading-relaxed px-3 pb-1 text-sm text-pretty">
        {{ comment.content }}
      </div>

      <div class="flex flex-row items-center justify-end gap-2 px-2">
        <div class="flex flex-row items-center gap-1">
          <ForumSignInPrompt action="reply">
            <SButton
              size="xs"
              variant="ghost"
              color="neutral"
              :label="$t('components.discussion.reply')"
              icon="i-fluent-arrow-reply-24-regular"
              sound="press"
              @click="displayReply = !displayReply"
            />
          </ForumSignInPrompt>

          <UPopover v-model:open="menuOpen">
            <SButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-fluent-more-horizontal-24-regular"
              sound="press"
              :aria-label="$t('components.discussion.moreActions')"
              aria-haspopup="menu"
              :aria-expanded="menuOpen"
              :aria-controls="menuId"
            />
            <template #content>
              <div
                :id="menuId"
                role="menu"
                class="flex min-w-40 flex-col p-1"
                :aria-label="$t('components.discussion.moreActions')"
              >
                <SButton
                  size="sm"
                  variant="ghost"
                  color="neutral"
                  icon="i-fluent-link-24-regular"
                  class="justify-start"
                  sound="press"
                  role="menuitem"
                  :label="$t('components.discussion.permalink')"
                  @click="onPermalinkClick"
                />
                <SButton
                  v-if="canReport"
                  size="sm"
                  variant="ghost"
                  color="neutral"
                  icon="i-fluent-flag-24-regular"
                  class="justify-start"
                  sound="press"
                  role="menuitem"
                  :label="$t('components.discussion.report.action')"
                  @click="onReportClick"
                />
                <SButton
                  v-if="canModerate"
                  size="sm"
                  variant="ghost"
                  color="neutral"
                  icon="i-fluent-eye-off-24-regular"
                  class="justify-start"
                  sound="press"
                  role="menuitem"
                  :label="$t('components.discussion.hide')"
                  :loading="isModerating"
                  :disabled="isModerating"
                  @click="onHide"
                />
                <SButton
                  v-if="canModerate"
                  size="sm"
                  variant="ghost"
                  color="error"
                  icon="i-fluent-delete-24-regular"
                  class="justify-start"
                  sound="press"
                  role="menuitem"
                  :label="$t('components.discussion.delete')"
                  :loading="isModerating"
                  :disabled="isModerating"
                  @click="onDelete"
                />
              </div>
            </template>
          </UPopover>
        </div>
      </div>
    </div>

    <DiscussionCommentReportModal v-model:open="displayReport" :comment-id="comment.id" />

    <div v-if="displayReply || hasReplies" class="flex w-full flex-col">
      <div v-if="displayReply && user" class="flex w-full flex-row items-stretch">
        <DiscussionCommentThreadConnector :is-last="!hasReplies" />
        <div class="min-w-0 flex-1 px-3 py-1">
          <DiscussionCommentComposer
            :target-type="targetType"
            :target-id="targetId"
            :reply-to-id="comment.id"
            autofocus
            @comment-created="onCommentCreated"
          />
        </div>
      </div>

      <div
        v-for="(child, index) in replies"
        :key="child.id"
        class="flex w-full flex-row items-stretch"
      >
        <DiscussionCommentThreadConnector :is-last="index === lastReplyIndex" />
        <DiscussionCommentItem
          class="min-w-0 flex-1"
          :comment="child"
          :target-type="targetType"
          :target-id="targetId"
          @changed="emit('changed')"
        />
      </div>
    </div>
  </article>
</template>

<style scoped>
.comment-highlight {
  animation: comment-highlight var(--duration-emphasis) ease-out;
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
