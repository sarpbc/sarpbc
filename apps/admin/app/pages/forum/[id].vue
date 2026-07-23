<script lang="ts" setup>
import type { Reply } from "~/types/forum";

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();

const postId = computed(() => route.params.id as string);
const isDeletePostModalOpen = ref(false);
const isDeleteReplyModalOpen = ref(false);
const replyToDelete = ref<Reply | null>(null);
const isDeletingPost = ref(false);
const isDeletingReply = ref(false);
const hidingReplyId = ref<string | null>(null);

const {
  data: post,
  status,
  refresh,
} = await useLazyAsyncData(
  () => `admin-forum-post-${postId.value}`,
  () => getPostById(postId.value),
  { server: false, watch: [postId] },
);

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
      await navigateTo(localePath("/forum"));
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
  if (hidingReplyId.value) return;
  hidingReplyId.value = reply.id;
  try {
    const success = await hideForumReply(reply.id);
    if (success) {
      toast.add({
        title: t("page.forum.messages.hidden"),
        color: "success",
      });
      await refresh();
    } else {
      toast.add({
        title: t("page.forum.messages.errorTitle"),
        description: t("page.forum.messages.moderateError"),
        color: "error",
      });
    }
  } finally {
    hidingReplyId.value = null;
  }
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <UButton
        color="error"
        variant="soft"
        icon="i-fluent-delete-24-regular"
        :label="$t('page.forum.delete.postTitle')"
        class="cursor-pointer"
        @click="isDeletePostModalOpen = true"
      />
    </template>

    <DashboardContent>
      <p v-if="status === 'pending'" class="text-sm text-muted">
        {{ $t("page.forum.loading") }}
      </p>

      <p v-else-if="!post" class="text-sm text-muted">
        {{ $t("page.forum.notFound") }}
      </p>

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
                <span translate="no">{{ reply.author }}</span>
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
                class="cursor-pointer"
                @click="hideReply(reply)"
              />
              <UButton
                color="error"
                variant="ghost"
                icon="i-fluent-delete-24-regular"
                :aria-label="$t('page.forum.delete.replyTitle')"
                class="cursor-pointer"
                @click="openDeleteReplyModal(reply)"
              />
            </div>
          </div>

          <p v-if="flatReplies.length === 0" class="text-sm text-muted">
            {{ $t("page.forum.replies.empty") }}
          </p>
        </div>
      </div>

      <UModal
        v-model:open="isDeletePostModalOpen"
        :title="$t('page.forum.delete.postTitle')"
        :dismissible="!isDeletingPost"
      >
        <template #body>
          <p>
            {{
              $t("page.forum.delete.postConfirm", {
                title: post?.title ?? "",
              })
            }}
          </p>
        </template>
        <template #footer>
          <UButton
            color="error"
            :loading="isDeletingPost"
            :label="$t('page.forum.delete.confirmButton')"
            class="cursor-pointer"
            @click="confirmDeletePost"
          />
          <UButton
            color="neutral"
            variant="subtle"
            :label="$t('common.cancel')"
            :disabled="isDeletingPost"
            class="cursor-pointer"
            @click="isDeletePostModalOpen = false"
          />
        </template>
      </UModal>

      <UModal
        v-model:open="isDeleteReplyModalOpen"
        :title="$t('page.forum.delete.replyTitle')"
        :dismissible="!isDeletingReply"
      >
        <template #body>
          <p>{{ $t("page.forum.delete.replyConfirm") }}</p>
        </template>
        <template #footer>
          <UButton
            color="error"
            :loading="isDeletingReply"
            :label="$t('page.forum.delete.confirmButton')"
            class="cursor-pointer"
            @click="confirmDeleteReply"
          />
          <UButton
            color="neutral"
            variant="subtle"
            :label="$t('common.cancel')"
            :disabled="isDeletingReply"
            class="cursor-pointer"
            @click="isDeleteReplyModalOpen = false"
          />
        </template>
      </UModal>
    </DashboardContent>
  </NuxtLayout>
</template>
