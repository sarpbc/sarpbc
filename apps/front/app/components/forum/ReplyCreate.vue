<script lang="ts" setup>
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Reply } from "~/types/forum";

const { reply = undefined, postId } = defineProps<{
  postId: string;
  reply?: Reply;
}>();

const emit = defineEmits<{
  replyCreated: [];
}>();

const { t } = useI18n();

const toast = useToast();

const schema = z.object({
  content: z
    .string()
    .min(1, t("components.reply.validation.contentMinLength"))
    .max(2048, t("components.reply.validation.contentMaxLength")),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  content: "",
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  event.preventDefault();

  const result = schema.safeParse(state);
  if (!result.success) {
    return;
  }

  const success = await createForumReply({
    content: result.data.content,
    postId,
    replyToId: reply?.id,
  });

  if (success) {
    toast.add({
      title: t("components.reply.messages.successTitle"),
      description: t("components.reply.messages.successDescription"),
      color: "success",
    });

    state.content = "";
    emit("replyCreated");
  } else {
    toast.add({
      title: t("components.reply.messages.errorTitle"),
      description: t("components.reply.messages.errorDescription"),
      color: "error",
    });
  }
}
</script>

<template>
  <div class="text-toned whitespace-pre-wrap leading-relaxed p-4">
    <UForm :schema="schema" :state="state" class="w-full flex flex-col gap-2" @submit="onSubmit">
      <UFormField :label="$t('components.reply.inputTitle')" name="content" required class="w-full">
        <UTextarea
          v-model="state.content"
          variant="soft"
          :placeholder="$t('components.reply.inputPlaceholder')"
          class="w-full"
          autoresize
        />
      </UFormField>

      <UButton type="submit" variant="soft" class="w-fit cursor-pointer">
        {{ $t("components.reply.submit") }}
      </UButton>
    </UForm>
  </div>
</template>
