<script lang="ts" setup>
import type { Comment, CommentTargetType, PaginatedComments } from "~/types/discussion";
import { parseCommentHash } from "~/utils/commentPermalink";
import { findCommentInTree } from "~/utils/commentTree";

const {
  targetType,
  targetId,
  flushTop = false,
} = defineProps<{
  targetType: CommentTargetType;
  targetId: string;
  /** Sits under an `SRail` section caption, which already draws the top hairline. */
  flushTop?: boolean;
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
  <section class="w-full flex flex-col gap-4" :aria-label="t('components.discussion.heading')">
    <div
      v-if="pending"
      class="flex flex-col gap-4"
      :class="{ '-mt-px': flushTop }"
      aria-live="polite"
    >
      <div
        v-for="n in 3"
        :key="n"
        class="h-24 border border-default bg-elevated/40 animate-pulse"
      />
    </div>

    <SCard v-else-if="error" :flush-top="flushTop">
      <SErrorState :message="t('components.discussion.error')" @retry="refresh()" />
    </SCard>

    <template v-else>
      <!-- Boxed comments overlap the caption hairline rather than stacking a second rule. -->
      <div v-if="comments.length" class="flex flex-col gap-4" :class="{ '-mt-px': flushTop }">
        <DiscussionCommentItem
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          :target-type="targetType"
          :target-id="targetId"
          @changed="onChanged"
        />

        <div v-if="hasMore" class="flex justify-center">
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
      </div>

      <SCard
        :flush-top="flushTop && !comments.length"
        class="flex min-h-row h-row-grid items-center px-3 py-2"
      >
        <DiscussionCommentComposer
          :target-type="targetType"
          :target-id="targetId"
          @comment-created="onChanged"
        />
      </SCard>
    </template>
  </section>
</template>
