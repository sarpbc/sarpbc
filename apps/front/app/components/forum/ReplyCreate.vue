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
const user = useUser();
const toast = useToast();
const isSubmitting = ref(false);

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

const contentInputRef = useTemplateRef("contentInput");

function focusContentInput() {
  nextTick(() => {
    const component = contentInputRef.value;
    if (!component) return;

    const root =
      component instanceof HTMLElement ? component : (component as { $el?: HTMLElement }).$el;
    const textarea = root?.querySelector?.("textarea") ?? root;
    textarea?.focus();
  });
}

onMounted(focusContentInput);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  event.preventDefault();

  if (!user.value) {
    return;
  }

  const result = schema.safeParse(state);
  if (!result.success) {
    return;
  }

  isSubmitting.value = true;

  const createResult = await createForumReply({
    content: result.data.content,
    postId,
    replyToId: reply?.id,
  });

  isSubmitting.value = false;

  if (createResult.ok) {
    state.content = "";
    emit("replyCreated");
    return;
  }

  const description =
    createResult.reason === "unauthorized"
      ? t("components.reply.messages.signInRequired")
      : createResult.reason === "rate_limited"
        ? (createResult.message ?? t("components.reply.messages.rateLimitDescription"))
        : (createResult.message ?? t("components.reply.messages.errorDescription"));

  toast.add({
    title: t("components.reply.messages.errorTitle"),
    description,
    color: "error",
  });
}
</script>

<template>
  <div class="text-toned whitespace-pre-wrap leading-relaxed p-4">
    <UForm :schema="schema" :state="state" class="w-full flex flex-col gap-2" @submit="onSubmit">
      <UFormField :label="$t('components.reply.inputTitle')" name="content" required class="w-full">
        <UTextarea
          ref="contentInput"
          v-model="state.content"
          variant="soft"
          :placeholder="$t('components.reply.inputPlaceholder')"
          class="w-full"
          autoresize
          :disabled="isSubmitting"
        />
      </UFormField>

      <UButton
        type="submit"
        variant="soft"
        class="w-fit cursor-pointer"
        :loading="isSubmitting"
        :disabled="isSubmitting"
      >
        {{ $t("components.reply.submit") }}
      </UButton>
    </UForm>
  </div>
</template>
