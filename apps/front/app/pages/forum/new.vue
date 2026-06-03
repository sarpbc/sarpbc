<script lang="ts" setup>
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Topic } from "~/types/forum";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const localePath = useLocalePath();

setPageSeo({
  title: t("page.forum.new.title"),
  description: t("page.forum.new.description"),
  noIndex: true,
});

const toast = useToast();

const schema = z.object({
  title: z
    .string()
    .min(1, t("page.forum.new.validation.titleMinLength"))
    .max(128, t("page.forum.new.validation.titleMaxLength")),
  topicId: z.uuid(),
  content: z
    .string()
    .min(1, t("page.forum.new.validation.contentMinLength"))
    .max(2048, t("page.forum.new.validation.contentMaxLength")),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  title: "",
  topicId: "",
  content: "",
});

const topics = ref<Topic[]>([]);

onMounted(async () => {
  topics.value = await getTopics();
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  event.preventDefault();

  const result = schema.safeParse(state);
  if (!result.success) {
    return;
  }

  const success = await createForumPost({
    title: result.data.title,
    content: result.data.content,
    topicId: result.data.topicId,
  });

  if (success) {
    toast.add({
      title: t("page.forum.new.messages.successTitle"),
      description: t("page.forum.new.messages.successDescription"),
      color: "success",
    });

    navigateTo(localePath("/forum"));
  } else {
    toast.add({
      title: t("page.forum.new.messages.errorTitle"),
      description: t("page.forum.new.messages.errorDescription"),
      color: "error",
    });
  }
}
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiCrossCard class="w-full h-14">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-xl font-semibold text-highlighted">
          {{ $t("page.forum.new.pageTitle") }}
        </h1>
      </div>
    </UiCrossCard>
    <UiCard class="p-4">
      <UForm :schema="schema" :state="state" class="w-full space-y-4" @submit="onSubmit">
        <UFormField
          :label="$t('page.forum.new.form.title')"
          name="title"
          :required="true"
          class="w-full"
        >
          <UInput
            v-model="state.title"
            variant="soft"
            :placeholder="$t('page.forum.new.form.titlePlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('page.forum.new.form.topic')"
          name="topicId"
          :required="true"
          class="w-full"
        >
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="topic in topics"
              :key="topic.id"
              variant="soft"
              size="lg"
              :color="state.topicId === topic.id ? 'primary' : 'neutral'"
              class="cursor-pointer"
              @click="state.topicId = topic.id"
            >
              {{ topic.title }}
            </UBadge>
          </div>
        </UFormField>

        <UFormField
          :label="$t('page.forum.new.form.content')"
          name="content"
          :required="true"
          class="w-full"
        >
          <UTextarea
            v-model="state.content"
            variant="soft"
            :placeholder="$t('page.forum.new.form.contentPlaceholder')"
            class="w-full"
            autoresize
          />
        </UFormField>

        <UButton type="submit" variant="soft" class="cursor-pointer">
          {{ $t("page.forum.new.form.submit") }}
        </UButton>
      </UForm>
    </UiCard>
  </div>
</template>
