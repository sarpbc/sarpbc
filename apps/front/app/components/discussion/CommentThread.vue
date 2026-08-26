<script lang="ts" setup>
import type { Comment, CommentTargetType, PaginatedComments } from "~/types/discussion";
import { parseCommentHash } from "~/utils/commentPermalink";
import { findCommentInTree } from "~/utils/commentTree";

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

const loadedExtraPages = ref(0);
const appendedReplies = ref<Comment[]>([]);
const loadingMore = ref(false);

const {
  data: pageData,
  pending,
  error,
  refresh,
} = await useAsyncData<PaginatedComments>(
  () => `comments-${targetType}-${targetId}`,
  () => getCommentsByTarget(targetType, targetId, 0),
  {
    watch: [() => targetType, () => targetId],
    default: () => ({ replies: [], total: 0, page: 0, limit: 25 }),
  },
);

const comments = computed(() => [...(pageData.value?.replies ?? []), ...appendedReplies.value]);
const total = computed(() => pageData.value?.total ?? 0);
const pageSize = computed(() => pageData.value?.limit ?? 25);
const hasMore = computed(() => comments.value.length < total.value);

function resetExtraPages() {
  loadedExtraPages.value = 0;
  appendedReplies.value = [];
}

watch(
  () => [targetType, targetId] as const,
  () => {
    resetExtraPages();
  },
);

async function loadMore() {
  if (loadingMore.value || !hasMore.value) {
    return;
  }

  loadingMore.value = true;
  try {
    const nextPage = loadedExtraPages.value + 1;
    const result = await getCommentsByTarget(targetType, targetId, nextPage);
    appendedReplies.value = [...appendedReplies.value, ...result.replies];
    loadedExtraPages.value = nextPage;
  } finally {
    loadingMore.value = false;
  }
}

async function onChanged() {
  const pagesLoaded = loadedExtraPages.value + 1;
  const limit = refetchLimitForLoadedPages(pagesLoaded, pageSize.value);
  const result = await getCommentsByTarget(targetType, targetId, 0, limit);
  pageData.value = result;
  resetExtraPages();
}

function isCommentLoaded(commentId: string): boolean {
  return findCommentInTree(comments.value, commentId);
}

async function loadUntilCommentLoaded(commentId: string): Promise<boolean> {
  if (isCommentLoaded(commentId)) {
    return true;
  }

  while (comments.value.length < total.value) {
    await loadMore();
    if (isCommentLoaded(commentId)) {
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

  await loadUntilCommentLoaded(commentId);
  tryScrollFromHash();
}

watch(
  () => route.hash,
  () => {
    void nextTick(() => {
      void resolveHashTarget();
    });
  },
);

onMounted(() => {
  void nextTick(() => {
    void resolveHashTarget();
  });
});
</script>

<template>
  <section class="w-full" :aria-label="t('components.discussion.heading')">
    <SCard v-if="pending" aria-live="polite">
      <div class="flex flex-col gap-row py-3">
        <div v-for="n in 3" :key="n" class="h-row-double bg-elevated/40 animate-pulse" />
      </div>
    </SCard>

    <SCard v-else-if="error">
      <div class="flex flex-col items-center gap-3 py-8 px-4 text-center">
        <p class="text-sm text-muted">
          {{ t("components.discussion.error") }}
        </p>
        <SButton variant="outline" @click="refresh()">
          {{ t("components.discussion.retry") }}
        </SButton>
      </div>
    </SCard>

    <SCard v-else>
      <div class="flex flex-col gap-row py-3">
        <DiscussionCommentItem
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          :target-type="targetType"
          :target-id="targetId"
          @changed="onChanged"
        />

        <div v-if="hasMore" class="flex justify-center px-3">
          <SButton
            variant="outline"
            :loading="loadingMore"
            :disabled="loadingMore"
            @click="loadMore"
          >
            {{
              loadingMore
                ? t("components.discussion.loadingMore")
                : t("components.discussion.loadMore")
            }}
          </SButton>
        </div>

        <div class="px-3">
          <DiscussionCommentComposer
            :target-type="targetType"
            :target-id="targetId"
            @comment-created="onChanged"
          />
        </div>
      </div>
    </SCard>
  </section>
</template>
