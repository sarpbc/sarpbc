<script lang="ts" setup>
import type { ModerationReply } from "@sarpbc/types";
import { getApiErrorMessage, parseLocale } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();
const config = useRuntimeConfig();

const breadcrumbItems = [
  {
    label: t("page.moderation.title"),
  },
];

const dateFormatter = useDateFormatter({ dateStyle: "medium", timeStyle: "short" });

const hidingReplyId = ref<string | null>(null);
const replyToDelete = ref<ModerationReply | null>(null);

const { status, data, error, refresh } = await useLazyAsyncData(
  "admin-moderation-replies",
  () => getModerationReplies(),
  { server: false },
);

const replies = computed(() => data.value ?? []);

const targetTypeLabel = (targetType: ModerationReply["targetType"]): string => {
  switch (targetType) {
    case "forumPost": {
      return t("page.moderation.targetTypes.forumPost");
    }

    case "newsArticle": {
      return t("page.moderation.targetTypes.newsArticle");
    }

    case "match": {
      return t("page.moderation.targetTypes.match");
    }

    default: {
      const _exhaustive: never = targetType;

      return String(_exhaustive);
    }
  }
};

const publicTargetUrl = (reply: ModerationReply): string =>
  `${config.public.publicSiteUrl}${reply.targetPath}`;

const hideReply = async (reply: ModerationReply) => {
  if (hidingReplyId.value) {
    return;
  }

  hidingReplyId.value = reply.id;

  try {
    await hideForumReply(reply.id);
    toast.add({
      color: "success",
      title: t("page.moderation.messages.hidden"),
    });
    await refresh();
  } catch (hideError) {
    reportError(hideError, t("page.moderation.messages.moderateError"));
  } finally {
    hidingReplyId.value = null;
  }
};

const onReplyDeleted = async () => {
  toast.add({
    color: "success",
    title: t("page.moderation.messages.deleted"),
  });
  await refresh();
};
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <SbBreadcrumb :items="breadcrumbItems" />
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

        <SbErrorState
          v-else-if="status === 'error'"
          :message="getApiErrorMessage(error) ?? $t('page.moderation.loadError')"
          @retry="refresh()"
        />

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
                <SbBadge v-if="reply.reportCount > 0" color="danger">
                  {{
                    $t("page.moderation.reportedBadge", {
                      count: reply.reportCount,
                    })
                  }}
                </SbBadge>
                <SbBadge v-if="reply.hiddenAt">
                  {{ $t("page.moderation.hiddenBadge") }}
                </SbBadge>
              </div>
              <div class="flex flex-row items-center gap-1">
                <SbButton
                  variant="tertiary"
                  :label="$t('page.moderation.hide')"
                  :loading="hidingReplyId === reply.id"
                  :disabled="hidingReplyId !== null || !!reply.hiddenAt"
                  @click="hideReply(reply)"
                />
                <SbButton
                  variant="tertiary"
                  danger
                  icon="i-fluent-delete-24-regular"
                  :aria-label="$t('page.moderation.delete')"
                  @click="replyToDelete = reply"
                />
              </div>
            </div>

            <p class="whitespace-pre-wrap text-sm">{{ reply.content }}</p>

            <div class="flex flex-row flex-wrap items-center gap-2 text-sm">
              <span class="text-muted">{{ targetTypeLabel(reply.targetType) }}</span>
              <SbLink variant="accent" :to="publicTargetUrl(reply)" external target="_blank">
                {{ reply.targetLabel }}
              </SbLink>
              <SbLink
                v-if="reply.targetType === 'forumPost'"
                :to="localePath(`/forum/${reply.targetId}`)"
              >
                {{ $t("page.moderation.openInAdmin") }}
              </SbLink>
            </div>
          </article>
        </div>
      </div>

      <ConfirmDeleteModal
        v-model:target="replyToDelete"
        :title="$t('page.moderation.delete')"
        :confirm-label="$t('page.moderation.deleteConfirmButton')"
        :message="() => $t('page.moderation.deleteConfirm')"
        :remove="(reply) => deleteForumReply(reply.id)"
        @deleted="onReplyDeleted"
      />
    </DashboardContent>
  </NuxtLayout>
</template>
