<script lang="ts" setup>
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { CommentTargetType } from "~/types/discussion";

const {
  targetType,
  targetId,
  replyToId = undefined,
  autofocus = true,
} = defineProps<{
  targetType: CommentTargetType;
  targetId: string;
  replyToId?: string;
  autofocus?: boolean;
}>();

const emit = defineEmits<{
  commentCreated: [];
}>();

const { t } = useI18n();
const user = useUser();
const toast = useToast();
const isSubmitting = ref(false);

const schema = z.object({
  content: z
    .string()
    .min(1, t("components.discussion.validation.contentMinLength"))
    .max(2048, t("components.discussion.validation.contentMaxLength")),
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

onMounted(() => {
  if (autofocus) focusContentInput();
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  event.preventDefault();

  if (!user.value) {
    return;
  }

  const result = schema.safeParse({
    content: state.content?.trim() ?? "",
  });
  if (!result.success) {
    return;
  }

  isSubmitting.value = true;

  const createResult = await createComment({
    content: result.data.content,
    targetType,
    targetId,
    replyToId,
  });

  isSubmitting.value = false;

  if (createResult.ok) {
    state.content = "";
    emit("commentCreated");
    toast.add({
      title: t("components.discussion.messages.created"),
      color: "success",
    });
    return;
  }

  const description =
    createResult.reason === "unauthorized"
      ? t("components.discussion.messages.signInRequired")
      : createResult.reason === "rate_limited"
        ? (createResult.message ?? t("components.discussion.messages.rateLimitDescription"))
        : (createResult.message ?? t("components.discussion.messages.errorDescription"));

  toast.add({
    title: t("components.discussion.messages.errorTitle"),
    description,
    color: "error",
  });
}
</script>

<template>
  <div class="w-full">
    <ForumSignInPrompt v-if="!user" action="reply" />
    <UForm
      v-else
      :schema="schema"
      :state="state"
      class="w-full flex flex-col gap-2"
      @submit="onSubmit"
    >
      <UFormField
        :label="$t('components.discussion.inputTitle')"
        name="content"
        required
        class="w-full"
      >
        <UTextarea
          ref="contentInput"
          v-model="state.content"
          variant="soft"
          :placeholder="$t('components.discussion.inputPlaceholder')"
          class="w-full text-base"
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
        {{
          isSubmitting ? $t("components.discussion.submitting") : $t("components.discussion.submit")
        }}
      </UButton>
    </UForm>
  </div>
</template>
