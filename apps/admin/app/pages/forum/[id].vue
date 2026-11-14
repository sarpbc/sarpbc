<script lang="ts" setup>
import type { ForumPost, Reply } from "@sarpbc/types";
import { getApiErrorMessage } from "@sarpbc/utils";

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

const postId = computed(() => String(route.params.id));
const postToDelete = ref<ForumPost | null>(null);
const replyToDelete = ref<Reply | null>(null);
const hidingReplyId = ref<string | null>(null);

const {
  data: thread,
  status,
  error,
  refresh,
} = await useLazyAsyncData(
  () => `admin-forum-post-${postId.value}`,
  async () => {
    const post = await getPostById(postId.value);

    return { post, replies: await getPostReplies(post.id) };
  },
  { server: false, watch: [postId] },
);

const post = computed(() => thread.value?.post ?? null);

const breadcrumbItems = computed(() => [
  {
    label: t("page.forum.title"),
    to: localePath("/forum"),
  },
  {
    label: post.value?.title ?? postId.value,
  },
]);

const flatReplies = computed(() => {
  const items: Reply[] = [];

  const walk = (replies: Reply[]) => {
    for (const reply of replies) {
      items.push(reply);

      if (reply.replies.length) {
        walk(reply.replies);
      }
    }
  };

  walk(thread.value?.replies ?? []);

  return items;
});

const hideReply = async (reply: Reply) => {
  if (hidingReplyId.value) {
    return;
  }

  hidingReplyId.value = reply.id;

  try {
    await hideForumReply(reply.id);
    toast.add({
      title: t("page.forum.messages.hidden"),
      color: "success",
    });
    await refresh();
  } catch (hideError) {
    reportError(hideError, t("page.forum.messages.moderateError"));
  } finally {
    hidingReplyId.value = null;
  }
};
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <UButton
        v-if="post"
        color="error"
        variant="soft"
        icon="i-fluent-delete-24-regular"
        :label="$t('page.forum.delete.postTitle')"
        @click="postToDelete = post"
      />
    </template>

    <DashboardContent>
      <p v-if="status === 'pending'" class="text-sm text-muted">
        {{ $t("page.forum.loading") }}
      </p>

      <LoadError
        v-else-if="!post"
        :message="getApiErrorMessage(error) ?? $t('common.loadFailed')"
        @retry="refresh()"
      />

      <div v-else class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <h1 class="text-2xl font-semibold tracking-tight">{{ post.title }}</h1>
          <p class="text-sm text-muted">
            <span translate="no">{{ post.author }}</span>
            · {{ new Date(post.createdAt).toLocaleString() }}
          </p>
          <p class="whitespace-pre-wrap">{{ post.content }}</p>
        </div>

        <div class="flex flex-col gap-3">
          <h2 class="text-lg font-semibold">
            {{ $t("page.forum.replies.title") }}
          </h2>

          <div
            v-for="reply in flatReplies"
            :key="reply.id"
            class="flex flex-row items-start justify-between gap-4 border border-default p-4"
          >
            <div class="flex min-w-0 flex-col gap-1">
              <p class="text-sm text-muted">
                <span translate="no">{{ reply.author.userName }}</span>
                · {{ new Date(reply.createdAt).toLocaleString() }}
              </p>
              <p class="whitespace-pre-wrap">{{ reply.content }}</p>
            </div>
            <div class="flex shrink-0 flex-row items-center gap-1">
              <UButton
                color="neutral"
                variant="ghost"
                :label="$t('page.forum.hide')"
                :loading="hidingReplyId === reply.id"
                :disabled="hidingReplyId !== null"
                @click="hideReply(reply)"
              />
              <UButton
                color="error"
                variant="ghost"
                icon="i-fluent-delete-24-regular"
                :aria-label="$t('page.forum.delete.replyTitle')"
                @click="replyToDelete = reply"
              />
            </div>
          </div>

          <p v-if="flatReplies.length === 0" class="text-sm text-muted">
            {{ $t("page.forum.replies.empty") }}
          </p>
        </div>
      </div>

      <ConfirmDeleteModal
        v-model:target="postToDelete"
        :title="$t('page.forum.delete.postTitle')"
        :confirm-label="$t('page.forum.delete.confirmButton')"
        :message="(target) => $t('page.forum.delete.postConfirm', { title: target.title })"
        :remove="(target) => deleteForumPost(target.id)"
        @deleted="navigateTo(localePath('/forum'))"
      />

      <ConfirmDeleteModal
        v-model:target="replyToDelete"
        :title="$t('page.forum.delete.replyTitle')"
        :confirm-label="$t('page.forum.delete.confirmButton')"
        :message="() => $t('page.forum.delete.replyConfirm')"
        :remove="(target) => deleteForumReply(target.id)"
        @deleted="refresh()"
      />
    </DashboardContent>
  </NuxtLayout>
</template>
