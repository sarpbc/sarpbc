<script lang="ts" setup>
import type { ModerationReply } from "~/types/moderation";
import { getApiErrorMessage } from "~/utils/apiError";

const { t, locale } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const config = useRuntimeConfig();

const breadcrumbItems = [
  {
    label: t("page.moderation.title"),
  },
];

const publicSiteUrl = computed(() => String(config.public.publicSiteUrl).replace(/\/$/, ""));

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
);

const hidingReplyId = ref<string | null>(null);
const isDeleteReplyModalOpen = ref(false);
const replyToDelete = ref<ModerationReply | null>(null);
const isDeletingReply = ref(false);

const { status, data, error, refresh } = await useLazyAsyncData(
  "admin-moderation-replies",
  () => getModerationReplies(50),
  { server: false },
);

watch(error, (loadError) => {
  if (!loadError) {
    return;
  }

  toast.add({
    title: t("page.moderation.loadError"),
    description: getApiErrorMessage(loadError),
    color: "error",
  });
});

const replies = computed(() => data.value ?? []);

function targetTypeLabel(targetType: ModerationReply["targetType"]): string {
  switch (targetType) {
    case "forumPost":
      return t("page.moderation.targetTypes.forumPost");
    case "newsArticle":
      return t("page.moderation.targetTypes.newsArticle");
    case "match":
      return t("page.moderation.targetTypes.match");
    default: {
      const _exhaustive: never = targetType;
      return String(_exhaustive);
    }
  }
}

function publicTargetUrl(reply: ModerationReply): string {
  return `${publicSiteUrl.value}${reply.targetPath}`;
}

async function hideReply(reply: ModerationReply) {
  if (hidingReplyId.value) return;
  hidingReplyId.value = reply.id;
  try {
    const success = await hideForumReply(reply.id);
    if (success) {
      toast.add({
        title: t("page.moderation.messages.hidden"),
        color: "success",
      });
      await refresh();
    } else {
      toast.add({
        title: t("page.moderation.messages.errorTitle"),
        description: t("page.moderation.messages.moderateError"),
        color: "error",
      });
    }
  } finally {
    hidingReplyId.value = null;
  }
}

function openDeleteReplyModal(reply: ModerationReply) {
  replyToDelete.value = reply;
  isDeleteReplyModalOpen.value = true;
}

async function confirmDeleteReply() {
  if (!replyToDelete.value) return;
  isDeletingReply.value = true;
  try {
    const success = await deleteForumReply(replyToDelete.value.id);
    if (success) {
      toast.add({
        title: t("page.moderation.messages.deleted"),
        color: "success",
      });
      isDeleteReplyModalOpen.value = false;
      replyToDelete.value = null;
      await refresh();
    } else {
      toast.add({
        title: t("page.moderation.messages.errorTitle"),
        description: t("page.moderation.messages.moderateError"),
        color: "error",
      });
    }
  } finally {
    isDeletingReply.value = false;
  }
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">
          {{ $t("page.moderation.subtitle") }}
        </p>

        <div v-if="status === 'pending'" class="flex flex-col gap-3">
          <div v-for="n in 3" :key="n" class="flex flex-col gap-3 border border-default p-4">
            <div class="h-4 w-1/3 animate-pulse rounded-sm bg-elevated" />
            <div class="h-16 w-full animate-pulse rounded-sm bg-elevated" />
            <div class="h-4 w-1/2 animate-pulse rounded-sm bg-elevated" />
          </div>
        </div>

        <div
          v-else-if="status === 'error'"
          class="flex flex-col items-start gap-3 rounded-lg border border-default p-6"
        >
          <p class="text-sm text-muted">
            {{ getApiErrorMessage(error) ?? $t("page.moderation.loadError") }}
          </p>
          <UButton
            icon="i-fluent-arrow-clockwise-24-regular"
            :label="$t('page.moderation.retry')"
            variant="soft"
            @click="refresh()"
          />
        </div>

        <p v-else-if="replies.length === 0" class="text-sm text-muted">
          {{ $t("page.moderation.empty") }}
        </p>

        <div v-else class="flex flex-col gap-3">
          <article
            v-for="reply in replies"
            :key="reply.id"
            class="flex flex-col gap-3 border border-default p-4"
            :class="{ 'border-error/50 bg-error/5': reply.reportCount > 0 }"
          >
            <div class="flex flex-row flex-wrap items-center justify-between gap-2">
              <div class="flex flex-row flex-wrap items-center gap-2 text-sm text-muted">
                <span translate="no">{{ reply.author.userName }}</span>
                <span>·</span>
                <span class="tabular-nums">{{
                  dateFormatter.format(new Date(reply.createdAt))
                }}</span>
                <UBadge v-if="reply.reportCount > 0" color="error" variant="soft">
                  {{
                    $t("page.moderation.reportedBadge", {
                      count: reply.reportCount,
                    })
                  }}
                </UBadge>
                <UBadge v-if="reply.hiddenAt" color="neutral" variant="soft">
                  {{ $t("page.moderation.hiddenBadge") }}
                </UBadge>
              </div>
              <div class="flex flex-row items-center gap-1">
                <UButton
                  color="neutral"
                  variant="ghost"
                  :label="$t('page.moderation.hide')"
                  :loading="hidingReplyId === reply.id"
                  :disabled="hidingReplyId !== null || !!reply.hiddenAt"
                  @click="hideReply(reply)"
                />
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-fluent-delete-24-regular"
                  :aria-label="$t('page.moderation.delete')"
                  @click="openDeleteReplyModal(reply)"
                />
              </div>
            </div>

            <p class="whitespace-pre-wrap text-sm">{{ reply.content }}</p>

            <div class="flex flex-row flex-wrap items-center gap-2 text-sm">
              <span class="text-muted">{{ targetTypeLabel(reply.targetType) }}</span>
              <ULink
                :to="publicTargetUrl(reply)"
                external
                target="_blank"
                class="text-primary hover:underline"
              >
                {{ reply.targetLabel }}
              </ULink>
              <ULink
                v-if="reply.targetType === 'forumPost'"
                :to="localePath(`/forum/${reply.targetId}`)"
                class="text-muted hover:text-highlighted"
              >
                {{ $t("page.moderation.openInAdmin") }}
              </ULink>
            </div>
          </article>
        </div>
      </div>

      <UModal
        v-model:open="isDeleteReplyModalOpen"
        :title="$t('page.moderation.delete')"
        :dismissible="!isDeletingReply"
      >
        <template #body>
          <p>{{ $t("page.moderation.deleteConfirm") }}</p>
        </template>
        <template #footer>
          <UButton
            color="error"
            :loading="isDeletingReply"
            :label="$t('page.moderation.deleteConfirmButton')"
            @click="confirmDeleteReply"
          />
          <UButton
            color="neutral"
            variant="subtle"
            :label="$t('common.cancel')"
            :disabled="isDeletingReply"
            @click="isDeleteReplyModalOpen = false"
          />
        </template>
      </UModal>
    </DashboardContent>
  </NuxtLayout>
</template>
