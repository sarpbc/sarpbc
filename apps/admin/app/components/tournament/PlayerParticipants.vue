<script setup lang="ts">
import { watchDebounced } from "@vueuse/core";
import type { ParticipantPlayer, Player, TournamentFormat } from "@sarpbc/types";
import { TEAM_SIZE_BY_FORMAT, participantName } from "@sarpbc/utils";

const { format, modelValue } = defineProps<{
  modelValue: ParticipantPlayer[][];
  format: TournamentFormat;
}>();

const emit = defineEmits<{
  "update:modelValue": [ParticipantPlayer[][]];
}>();

const reportError = useReportError();

const query = ref("");
const pending = ref(false);
const results = ref<Player[]>([]);

const size = computed(() => TEAM_SIZE_BY_FORMAT[format]);
const taken = computed(() => new Set(modelValue.flat().map(({ id }) => id)));

const incomplete = computed(() => {
  const last = modelValue.at(-1);

  return last && last.length < size.value ? last : null;
});

const available = computed(() => results.value.filter(({ id }) => !taken.value.has(id)));

async function runSearch(searchQuery: string) {
  const trimmed = searchQuery.trim();

  if (!trimmed) {
    results.value = [];

    return;
  }

  pending.value = true;

  try {
    results.value = await searchPlayers(trimmed);
  } catch (searchError) {
    results.value = [];
    reportError(searchError);
  } finally {
    pending.value = false;
  }
}

watchDebounced(query, runSearch, { debounce: SEARCH_DEBOUNCE_MS });

function pick(player: Player) {
  const picked = { id: player.id, name: player.name, slug: player.slug };
  query.value = "";
  results.value = [];
  emit(
    "update:modelValue",
    incomplete.value
      ? [...modelValue.slice(0, -1), [...incomplete.value, picked]]
      : [...modelValue, [picked]],
  );
}

function remove(index: number) {
  emit(
    "update:modelValue",
    modelValue.filter((_, position) => position !== index),
  );
}
</script>

<template>
  <div class="flex flex-col gap-3 border border-default p-4">
    <ul v-if="modelValue.length" class="space-y-1">
      <li
        v-for="(players, index) in modelValue"
        :key="players.map(({ id }) => id).join(',')"
        class="flex items-center justify-between gap-2 text-sm"
      >
        <span :class="{ 'text-error': players.length !== size }">
          {{ participantName({ team: null, players }) }}
        </span>
        <UButton
          type="button"
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-fluent-dismiss-24-regular"
          :aria-label="
            $t('page.tournaments.form.playersRemove', {
              name: participantName({ team: null, players }),
            })
          "
          @click="remove(index)"
        />
      </li>
    </ul>
    <p v-else class="text-sm text-muted">{{ $t("page.tournaments.form.playersNone") }}</p>

    <p v-if="incomplete" class="text-sm">
      {{ $t("page.tournaments.form.playersPartner", { name: incomplete[0]?.name ?? "" }) }}
    </p>

    <UInput
      v-model="query"
      class="w-full"
      :placeholder="$t('page.tournaments.form.playersSearch')"
      :loading="pending"
      autocomplete="off"
    />

    <div v-if="query.trim() && !pending" class="max-h-56 overflow-y-auto overscroll-contain">
      <ul v-if="available.length" class="space-y-1">
        <li v-for="player in available" :key="player.id">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            size="sm"
            class="w-full justify-start"
            :label="player.name"
            @click="pick(player)"
          />
        </li>
      </ul>
      <p v-else class="text-sm text-muted">{{ $t("page.tournaments.form.playersEmpty") }}</p>
    </div>
  </div>
</template>
