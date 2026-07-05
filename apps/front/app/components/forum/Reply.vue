<script lang="ts" setup>
import type { Reply } from "~/types/forum";

const { locale } = useI18n();
const user = useUser();

const displayReplyCreation = ref(false);

const { reply, postId } = defineProps<{
  reply: Reply;
  postId: string;
}>();

const emit = defineEmits(["replyCreated"]);

function toggleDisplayReply() {
  displayReplyCreation.value = !displayReplyCreation.value;
}

function onReplyCreated() {
  emit("replyCreated");
  displayReplyCreation.value = false;
}
</script>

<template>
  <div class="w-full flex flex-col">
    <UiCard>
      <div class="flex flex-row items-center justify-end border-b border-default px-4 h-8">
        <span class="font-medium text-muted text-sm">
          {{ reply.author }}
        </span>
      </div>
      <div class="text-toned whitespace-pre-wrap leading-relaxed p-4">
        {{ reply.content }}
      </div>
      <div class="flex flex-row items-center justify-between border-t border-default px-4 h-8">
        <span class="font-light text-muted text-sm">
          {{ df(locale).format(new Date(reply.createdAt)) }}
        </span>

        <div class="flex flex-row items-center gap-1">
          <ForumSignInPrompt action="reply">
            <UButton
              size="sm"
              variant="soft"
              :label="$t('components.reply.submit')"
              icon="i-fluent-arrow-reply-24-regular"
              class="p-1! gap-1! cursor-pointer"
              @click="toggleDisplayReply"
            />
          </ForumSignInPrompt>
        </div>
      </div>
    </UiCard>
    <div class="w-full flex flex-col">
      <div v-if="displayReplyCreation && user" class="w-full flex flex-row h-fit">
        <ForumReplyConnector :show-full-connector="true" />
        <UiCard class="w-full mt-4">
          <ForumReplyCreate :post-id="postId" :reply="reply" @reply-created="onReplyCreated" />
        </UiCard>
      </div>
      <div
        v-for="(value, index) in reply.replies"
        :key="value.id"
        class="w-full flex flex-row h-fit"
      >
        <ForumReplyConnector :show-full-connector="index !== reply.replies.length - 1" />
        <ForumReply :reply="value" :post-id="postId" class="mt-4" @reply-created="onReplyCreated" />
      </div>
    </div>
  </div>
</template>
