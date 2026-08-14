<script setup lang="ts">
import { localizedNewsFields, parseNewsLocale } from "@sarpbc/utils";
import { newsSurfaceClass } from "~/utils/newsEditorLayout";

const title = defineModel<string>("title", { required: true });
const titleFr = defineModel<string>("titleFr", { required: true });
const content = defineModel<string>("content", { required: true });
const contentFr = defineModel<string>("contentFr", { required: true });

const editorLocale = ref<"en" | "fr">("en");
const previewing = ref(false);

const preview = computed(() =>
  localizedNewsFields(
    {
      title: title.value,
      content: content.value,
      titleFr: titleFr.value,
      contentFr: contentFr.value,
    },
    parseNewsLocale(editorLocale.value),
  ),
);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex items-center justify-between gap-3 border-b border-default px-4">
      <div class="flex items-center gap-1" role="tablist" :aria-label="$t('page.news.locale.tabs')">
        <UButton
          role="tab"
          :aria-selected="editorLocale === 'en'"
          size="sm"
          color="neutral"
          variant="link"
          :class="
            editorLocale === 'en'
              ? 'rounded-none border-b-2 border-highlighted text-highlighted'
              : 'rounded-none border-b-2 border-transparent text-muted'
          "
          class="cursor-pointer"
          @click="editorLocale = 'en'"
        >
          {{ $t("page.news.locale.en") }}
        </UButton>
        <UButton
          role="tab"
          :aria-selected="editorLocale === 'fr'"
          size="sm"
          color="neutral"
          variant="link"
          :class="
            editorLocale === 'fr'
              ? 'rounded-none border-b-2 border-highlighted text-highlighted'
              : 'rounded-none border-b-2 border-transparent text-muted'
          "
          class="cursor-pointer"
          @click="editorLocale = 'fr'"
        >
          {{ $t("page.news.locale.fr") }}
        </UButton>
      </div>
      <UTooltip
        :text="
          previewing ? $t('page.news.create.preview.hide') : $t('page.news.create.preview.show')
        "
      >
        <UButton
          icon="i-lucide-eye"
          size="sm"
          square
          color="neutral"
          :variant="previewing ? 'soft' : 'ghost'"
          :aria-pressed="previewing"
          :aria-label="
            previewing ? $t('page.news.create.preview.hide') : $t('page.news.create.preview.show')
          "
          class="cursor-pointer"
          @click="previewing = !previewing"
        />
      </UTooltip>
    </div>

    <DashboardContent v-show="!previewing" class="flex min-h-0 flex-1 flex-col gap-3 p-0 px-0 py-4">
      <NewsArticleEditor v-if="editorLocale === 'en'" v-model="content" />
      <NewsArticleEditor v-else-if="editorLocale === 'fr'" v-model="contentFr" />
    </DashboardContent>

    <DashboardContent
      v-show="previewing"
      class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-0 px-0 py-4"
    >
      <div :class="[newsSurfaceClass, 'sm:px-4']">
        <NewsMarkdownPreview v-if="preview.content" :value="preview.content" />
        <p v-else class="text-muted italic">
          {{ $t("page.news.create.preview.empty") }}
        </p>
      </div>
    </DashboardContent>
  </div>
</template>
