<script lang="ts" setup>
import type { Reply } from "~/types/forum";

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();

const postId = computed(() => route.params.id as string);
const isDeletePostModalOpen = ref(false);
const isDeleteReplyModalOpen = ref(false);
const replyToDelete = ref<Reply | null>(null);
const isDeletingPost = ref(false);
const isDeletingReply = ref(false);
const isHidingReply = ref(false);
const toast = useToast();

const { data: post, refresh } = await useLazyAsyncData(
  () => `admin-forum-post-${postId.value}`,
  () => getPostById(postId.value),
  { server: false, watch: [postId] },
);

const breadcrumbItems = computed(() => [
  {
    label: t("page.dashboard.forum.title"),
    to: localePath("/dashboard/forum"),
  },
  {
    label: post.value?.title ?? postId.value,
  },
]);

const flatReplies = computed(() => {
  const items: Reply[] = [];

  function walk(replies: Reply[]) {
    for (const reply of replies) {
      items.push(reply);
      if (reply.replies?.length) {
        walk(reply.replies);
      }
    }
  }

  if (post.value?.replies?.length) {
    walk(post.value.replies);
  }

  return items;
});

function openDeleteReplyModal(reply: Reply) {
  replyToDelete.value = reply;
  isDeleteReplyModalOpen.value = true;
}

async function confirmDeletePost() {
  isDeletingPost.value = true;
  try {
    const success = await deleteForumPost(postId.value);
    if (success) {
      await navigateTo(localePath("/dashboard/forum"));
    }
  } finally {
    isDeletingPost.value = false;
  }
}

async function confirmDeleteReply() {
  if (!replyToDelete.value) return;
  isDeletingReply.value = true;
  try {
    const success = await deleteForumReply(replyToDelete.value.id);
    if (success) {
      isDeleteReplyModalOpen.value = false;
      replyToDelete.value = null;
      await refresh();
    }
  } finally {
    isDeletingReply.value = false;
  }
}

async function hideReply(reply: Reply) {
  isHidingReply.value = true;
  try {
    const success = await hideComment(reply.id);
    if (success) {
      toast.add({
        title: t("components.discussion.messages.hidden"),
        color: "success",
      });
      await refresh();
    } else {
      toast.add({
        title: t("components.discussion.messages.errorTitle"),
        description: t("components.discussion.messages.moderateError"),
        color: "error",
      });
    }
  } finally {
    isHidingReply.value = false;
  }
}
</script>

<template>
  <NuxtLayout name="dashboardheader">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <UButton
        color="error"
        variant="soft"
        icon="i-fluent-delete-24-regular"
        :label="$t('page.dashboard.forum.delete.postTitle')"
        @click="isDeletePostModalOpen = true"
      />
    </template>

    <DashboardContent>
      <div v-if="post" class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <h1 class="text-2xl font-semibold">{{ post.title }}</h1>
          <p class="text-sm text-muted">
            {{ post.author }} · {{ new Date(post.createdAt).toLocaleString() }}
          </p>
          <p class="whitespace-pre-wrap">{{ post.content }}</p>
        </div>

        <div class="flex flex-col gap-3">
          <h2 class="text-lg font-semibold">
            {{ $t("page.dashboard.forum.replies.title") }}
          </h2>

          <UiCard
            v-for="reply in flatReplies"
            :key="reply.id"
            class="p-4 flex flex-row items-start justify-between gap-4"
          >
            <div class="flex flex-col gap-1 min-w-0">
              <p class="text-sm text-muted">
                {{ reply.author }} · {{ new Date(reply.createdAt).toLocaleString() }}
              </p>
              <p class="whitespace-pre-wrap">{{ reply.content }}</p>
            </div>
            <div class="flex flex-row items-center gap-1 shrink-0">
              <UButton
                color="neutral"
                variant="ghost"
                :label="$t('components.discussion.hide')"
                :loading="isHidingReply"
                :disabled="isHidingReply"
                @click="hideReply(reply)"
              />
              <UButton
                color="error"
                variant="ghost"
                icon="i-fluent-delete-24-regular"
                @click="openDeleteReplyModal(reply)"
              />
            </div>
          </UiCard>

          <p v-if="flatReplies.length === 0" class="text-sm text-muted">
            {{ $t("page.dashboard.forum.replies.empty") }}
          </p>
        </div>
      </div>

      <UModal v-model:open="isDeletePostModalOpen">
        <template #content>
          <div class="p-6 flex flex-col gap-4">
            <h3 class="text-lg font-semibold">
              {{ $t("page.dashboard.forum.delete.postTitle") }}
            </h3>
            <p>
              {{
                $t("page.dashboard.forum.delete.postConfirm", {
                  title: post?.title ?? "",
                })
              }}
            </p>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                :label="$t('common.cancel')"
                @click="isDeletePostModalOpen = false"
              />
              <UButton
                color="error"
                :loading="isDeletingPost"
                :label="$t('page.dashboard.forum.delete.confirmButton')"
                @click="confirmDeletePost"
              />
            </div>
          </div>
        </template>
      </UModal>

      <UModal v-model:open="isDeleteReplyModalOpen">
        <template #content>
          <div class="p-6 flex flex-col gap-4">
            <h3 class="text-lg font-semibold">
              {{ $t("page.dashboard.forum.delete.replyTitle") }}
            </h3>
            <p>{{ $t("page.dashboard.forum.delete.replyConfirm") }}</p>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                :label="$t('common.cancel')"
                @click="isDeleteReplyModalOpen = false"
              />
              <UButton
                color="error"
                :loading="isDeletingReply"
                :label="$t('page.dashboard.forum.delete.confirmButton')"
                @click="confirmDeleteReply"
              />
            </div>
          </div>
        </template>
      </UModal>
    </DashboardContent>
  </NuxtLayout>
</template>
