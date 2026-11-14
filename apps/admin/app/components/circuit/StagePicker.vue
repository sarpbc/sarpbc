<script lang="ts" setup>
import { watchDebounced } from "@vueuse/core";
import { tournamentStageLabel } from "@sarpbc/utils";

const SEARCH_DEBOUNCE_MS = 300;

export interface PickedStage {
  id: string;
  label: string;
}

const { title = null, description = null } = defineProps<{
  title?: string | null;
  description?: string | null;
}>();

const open = defineModel<boolean>("open", { required: true });
const emit = defineEmits<{ select: [stage: PickedStage] }>();

const reportError = useReportError();

const query = ref("");
const results = ref<PickedStage[]>([]);
const searching = ref(false);
const searched = ref(false);

async function runSearch(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    results.value = [];
    searched.value = false;

    return;
  }

  searching.value = true;

  try {
    const tournaments = await searchTournaments(trimmed);
    results.value = tournaments.map((tournament) => ({
      id: tournament.id,
      label: tournamentStageLabel(tournament),
    }));
    searched.value = true;
  } catch (error) {
    results.value = [];
    reportError(error);
  } finally {
    searching.value = false;
  }
}

watchDebounced(query, runSearch, { debounce: SEARCH_DEBOUNCE_MS });

watch(open, (isOpen) => {
  if (isOpen) return;
  query.value = "";
  results.value = [];
  searched.value = false;
});

function choose(stage: PickedStage) {
  open.value = false;
  emit("select", stage);
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title ?? $t('page.circuits.picker.title')"
    :description="description ?? $t('page.circuits.picker.hint')"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <UInput
          v-model="query"
          :loading="searching"
          :placeholder="$t('page.circuits.picker.placeholder')"
          :aria-label="$t('page.circuits.picker.placeholder')"
          icon="i-fluent-search-24-regular"
          autocomplete="off"
          class="w-full"
          autofocus
        />
        <p v-if="searched && results.length === 0" class="text-sm text-muted">
          {{ $t("page.circuits.picker.empty") }}
        </p>
        <ul v-else class="flex flex-col gap-1">
          <li v-for="stage in results" :key="stage.id">
            <UButton
              color="neutral"
              variant="ghost"
              block
              class="justify-start"
              :label="stage.label"
              @click="choose(stage)"
            />
          </li>
        </ul>
      </div>
    </template>
  </UModal>
</template>
