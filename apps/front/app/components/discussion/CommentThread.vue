<script lang="ts" setup>
import type { Comment, CommentTargetType } from "~/types/discussion";
import { commentAnchorId, parseCommentHash } from "~/utils/commentPermalink";

const { targetType, targetId } = defineProps<{
  targetType: CommentTargetType;
  targetId: string;
}>();

const { t } = useI18n();
const route = useRoute();

const { highlightedCommentId, navigateToComment, tryScrollFromHash } = useCommentPermalink();

provide("commentPermalink", {
  highlightedCommentId,
  navigateToComment,
});

const comments = ref<Comment[]>([]);
const total = ref(0);
const page = ref(0);
const pending = ref(true);
const loadingMore = ref(false);
const error = ref<Error | null>(null);

const hasComments = computed(() => comments.value.length > 0);
const hasMore = computed(() => comments.value.length < total.value);

async function fetchPage(pageToLoad: number, append: boolean) {
  const result = await getCommentsByTarget(targetType, targetId, pageToLoad, COMMENTS_PAGE_SIZE);
  total.value = result.total;
  page.value = pageToLoad;
  comments.value = append ? [...comments.value, ...result.replies] : result.replies;
}

async function loadInitial() {
  pending.value = true;
  error.value = null;
  try {
    await fetchPage(0, false);
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(String(err));
  } finally {
    pending.value = false;
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) {
    return;
  }

  loadingMore.value = true;
  try {
    await fetchPage(page.value + 1, true);
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(String(err));
  } finally {
    loadingMore.value = false;
  }
}

async function onChanged() {
  const pagesToLoad = page.value + 1;
  pending.value = true;
  error.value = null;
  try {
    const merged: Comment[] = [];
    let latestTotal = 0;
    for (let p = 0; p < pagesToLoad; p++) {
      const result = await getCommentsByTarget(targetType, targetId, p, COMMENTS_PAGE_SIZE);
      latestTotal = result.total;
      merged.push(...result.replies);
    }
    total.value = latestTotal;
    comments.value = merged;
    page.value = pagesToLoad - 1;
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(String(err));
  } finally {
    pending.value = false;
  }
}

watch(
  () => [targetType, targetId] as const,
  () => {
    void loadInitial();
  },
  { immediate: true },
);

async function loadUntilCommentVisible(commentId: string): Promise<boolean> {
  if (document.getElementById(commentAnchorId(commentId))) {
    return true;
  }

  while (comments.value.length < total.value) {
    await fetchPage(page.value + 1, true);
    if (document.getElementById(commentAnchorId(commentId))) {
      return true;
    }
  }

  return false;
}

async function resolveHashTarget() {
  const commentId = parseCommentHash(route.hash);
  if (!commentId) {
    return;
  }

  await loadUntilCommentVisible(commentId);
  tryScrollFromHash();
}

function attemptHashNavigation() {
  void nextTick(() => {
    void resolveHashTarget();
  });
}

watch(
  () => route.hash,
  () => {
    attemptHashNavigation();
  },
);

watch(comments, () => {
  if (route.hash) {
    attemptHashNavigation();
  }
});

onMounted(() => {
  attemptHashNavigation();
});
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
      <UButton variant="outline" @click="loadInitial()">
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

      <div v-if="hasMore" class="flex justify-center pt-2">
        <UButton variant="outline" :loading="loadingMore" :disabled="loadingMore" @click="loadMore">
          {{
            loadingMore
              ? t("components.discussion.loadingMore")
              : t("components.discussion.loadMore")
          }}
        </UButton>
      </div>
    </div>
  </section>
</template>
