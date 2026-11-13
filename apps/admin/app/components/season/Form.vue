<script lang="ts" setup>
import type { SeasonInput, SeasonSummary } from "@sarpbc/types";
import { SEASON_NAME_MAX_LENGTH } from "@sarpbc/utils";

const props = defineProps<{
  season?: SeasonSummary;
  submitLabel: string;
  loading: boolean;
}>();

const emit = defineEmits<{ submit: [input: SeasonInput] }>();

const name = ref(props.season?.name ?? "");

const isValid = computed(() => name.value.trim().length > 0);

function submit() {
  if (!isValid.value) return;
  emit("submit", { name: name.value.trim() });
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submit">
    <UFormField
      :label="$t('page.seasons.form.name')"
      :hint="$t('page.seasons.form.nameHint')"
      name="name"
      required
    >
      <UInput v-model="name" :maxlength="SEASON_NAME_MAX_LENGTH" class="w-full" />
    </UFormField>
    <div>
      <UButton type="submit" :label="submitLabel" :loading="loading" :disabled="!isValid" />
    </div>
  </form>
</template>
