<script lang="ts" setup>
import type { MediaImage } from "~/composables/images";

const emit = defineEmits<{
  select: [image: MediaImage];
}>();

const { t } = useI18n();

const limit = 24;
const page = ref(0);
const images = ref<MediaImage[]>([]);
const total = ref(0);
const isLoading = ref(false);

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit)));

async function loadImages() {
  isLoading.value = true;
  try {
    const response = await listMediaImages({ page: page.value, limit });
    images.value = response.data;
    total.value = response.total;
  } catch (error) {
    console.error("Failed to load media library:", error);
    images.value = [];
    total.value = 0;
  } finally {
    isLoading.value = false;
  }
}

function selectImage(image: MediaImage) {
  emit("select", image);
}

function previousPage() {
  if (page.value > 0) {
    page.value -= 1;
    void loadImages();
  }
}

function nextPage() {
  if (page.value + 1 < pageCount.value) {
    page.value += 1;
    void loadImages();
  }
}

onMounted(() => {
  void loadImages();
});
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="isLoading" class="text-sm text-muted">
      {{ $t("page.media.picker.loading") }}
    </div>
    <p v-else-if="images.length === 0" class="text-sm text-muted">
      {{ $t("page.media.picker.empty") }}
    </p>
    <ul v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <li v-for="image in images" :key="image.id">
        <button
          type="button"
          class="flex w-full flex-col gap-2 rounded-sm border border-default p-2 text-left transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          @click="selectImage(image)"
        >
          <img :src="image.url" alt="" class="aspect-video w-full rounded-sm object-cover" />
          <div class="min-w-0">
            <p v-if="image.source" class="truncate text-sm font-medium">
              {{ image.source }}
            </p>
            <a
              v-if="image.sourceUrl"
              :href="image.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="truncate text-xs text-muted underline-offset-2 hover:underline"
              @click.stop
            >
              {{ image.sourceUrl }}
            </a>
            <p v-else-if="!image.source" class="text-xs text-muted">
              {{ $t("page.media.noAttribution") }}
            </p>
          </div>
        </button>
      </li>
    </ul>
    <div v-if="pageCount > 1" class="flex items-center justify-between gap-2">
      <UButton
        size="sm"
        color="neutral"
        variant="outline"
        :disabled="page === 0 || isLoading"
        @click="previousPage"
      >
        {{ $t("page.media.picker.previous") }}
      </UButton>
      <p class="text-sm text-muted">
        {{ t("page.media.picker.page", { current: page + 1, total: pageCount }) }}
      </p>
      <UButton
        size="sm"
        color="neutral"
        variant="outline"
        :disabled="page + 1 >= pageCount || isLoading"
        @click="nextPage"
      >
        {{ $t("page.media.picker.next") }}
      </UButton>
    </div>
  </div>
</template>
