<script setup lang="ts" generic="T">
const target = defineModel<T | null>("target", { required: true });

const props = defineProps<{
  title: string;
  confirmLabel: string;
  message: (item: T) => string;
  remove: (item: T) => Promise<boolean | void>;
}>();

const emit = defineEmits<{ deleted: [] }>();

const isDeleting = ref(false);
// Clearing `target` closes the modal; keep the last item so the text survives the close transition.
const shown = shallowRef<T | null>(target.value);

watch(target, (item) => {
  if (item !== null) shown.value = item;
});

const open = computed({
  get: () => target.value !== null,
  set: (value) => {
    if (!value) target.value = null;
  },
});

async function confirm() {
  const item = target.value;
  if (item === null) return;
  isDeleting.value = true;
  try {
    if ((await props.remove(item)) === false) return;
    target.value = null;
    emit("deleted");
  } catch (error) {
    console.error("Failed to delete:", error);
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :dismissible="!isDeleting">
    <template #body>
      <p>{{ shown === null ? "" : message(shown) }}</p>
    </template>
    <template #footer>
      <UButton
        icon="i-fluent-delete-24-regular"
        color="error"
        :label="confirmLabel"
        :loading="isDeleting"
        @click="confirm"
      />
      <UButton
        color="neutral"
        variant="subtle"
        :label="$t('common.cancel')"
        :disabled="isDeleting"
        @click="open = false"
      />
    </template>
  </UModal>
</template>
