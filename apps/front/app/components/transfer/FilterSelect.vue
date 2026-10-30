<script lang="ts" setup>
import { refDebounced } from "@vueuse/core";
import type { TransferFilterKind, TransferFilterOption } from "~/composables/transfers";

const { kind, label, placeholder } = defineProps<{
  kind: TransferFilterKind;
  label: string;
  placeholder: string;
}>();

const model = defineModel<string | null>({ required: true });

const searchTerm = ref("");
const debouncedTerm = refDebounced(searchTerm, 250);

const { data: selected } = await useAsyncData(
  () => `transfer-filter-${kind}-${model.value ?? "none"}`,
  async () => (model.value ? await getTransferFilterOption(kind, model.value) : null),
  { watch: [model], default: () => null },
);

const { data: options, pending } = useLazyAsyncData(
  () => `transfer-filter-${kind}-options-${debouncedTerm.value}`,
  () => searchTransferFilterOptions(kind, debouncedTerm.value),
  { server: false, watch: [debouncedTerm], default: () => [] },
);

const items = computed<TransferFilterOption[]>(() => {
  const current = selected.value;
  const rest = (options.value ?? []).filter((option) => option.value !== current?.value);
  return current ? [current, ...rest] : rest;
});
</script>

<template>
  <USelectMenu
    v-model="model"
    v-model:search-term="searchTerm"
    :items="items"
    value-key="value"
    label-key="label"
    ignore-filter
    :loading="pending"
    :placeholder="placeholder"
    :aria-label="label"
    clear
    color="neutral"
    variant="outline"
    class="w-full"
  />
</template>
