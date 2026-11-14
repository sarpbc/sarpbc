<script lang="ts" setup>
import { TOURNAMENT_FORMATS } from "@sarpbc/types";
import type { League, ManualEvent, Team, TournamentDetail } from "@sarpbc/types";
import { toSlug } from "@sarpbc/utils";
import type { ManualTournamentFormState } from "~/composables/useManualTournamentForm";

const NEW_EVENT = "new";

const { modelValue, events, original, leagues, teams, slugAuto } = defineProps<{
  modelValue: ManualTournamentFormState;
  original: TournamentDetail | null;
  events: ManualEvent[];
  eventsPending?: boolean;
  leagues: League[];
  teams: Team[];
  teamsPending?: boolean;
  slugAuto?: boolean;
  imageDisabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [ManualTournamentFormState];
  "update:slugAuto": [boolean];
  "update:uploading": [boolean];
}>();

const { t } = useI18n();

const state = computed({
  get: () => modelValue,
  set: (value) => emit("update:modelValue", value),
});

function updateField<K extends keyof ManualTournamentFormState>(
  key: K,
  value: ManualTournamentFormState[K],
) {
  emit("update:modelValue", { ...modelValue, [key]: value });
}

const imageUrl = computed({
  get: () => modelValue.imageUrl,
  set: (value: string) => updateField("imageUrl", value),
});

const eventOptions = computed(() => {
  const options = events.map((event) => ({ value: event.id, label: event.name }));
  const current = original?.event;

  if (current && !options.some((option) => option.value === current.id)) {
    options.unshift({ value: current.id, label: current.name });
  }

  return original
    ? options
    : [{ value: NEW_EVENT, label: t("page.tournaments.form.newEvent") }, ...options];
});

const eventId = computed({
  get: () => modelValue.eventId || NEW_EVENT,
  set: (value: string) => updateField("eventId", value === NEW_EVENT ? "" : value),
});

/** Mirrors the API: only an event of its own (one stage, same name) follows the tournament's slug. */
const sharesEvent = computed(() => {
  if (!original) {
    return false;
  }

  const event = events.find((candidate) => candidate.id === original.event.id);

  return !event || event.stages.length !== 1 || event.name !== original.name;
});

const showsSlug = computed(() => editsEventSlug(modelValue, original) && !sharesEvent.value);

const movesEvent = computed(() => !!original && modelValue.eventId !== original.event.id);

const eventHelp = computed(() => {
  if (movesEvent.value) {
    return t("page.tournaments.form.eventMoveHelp");
  }

  if (sharesEvent.value) {
    return t("page.tournaments.form.eventSharedHelp");
  }

  return t("page.tournaments.form.eventHelp");
});

const leagueItems = computed(() => leagueOptions(leagues, t("page.tournaments.source.pandascore")));

const formatItems = TOURNAMENT_FORMATS.map((format) => ({ value: format, label: format }));

const teamSearch = ref("");

const filteredTeams = computed(() => {
  const query = teamSearch.value.trim().toLowerCase();

  if (!query) {
    return teams;
  }

  return teams.filter((team) => team.name.toLowerCase().includes(query));
});

// One emit: modelValue stays stale until the parent re-renders, so a second emit would drop the name.
function onNameInput(value: string) {
  emit("update:modelValue", {
    ...modelValue,
    name: value,
    slug: slugAuto ? toSlug(value) : modelValue.slug,
  });
}

function onSlugInput(value: string) {
  emit("update:slugAuto", false);
  updateField("slug", value);
}

function toggleTeam(teamId: string, checked: boolean) {
  const next = new Set(state.value.teamIds);

  if (checked) {
    next.add(teamId);
  } else {
    next.delete(teamId);
  }

  updateField("teamIds", [...next]);
}

function isTeamSelected(teamId: string): boolean {
  return state.value.teamIds.includes(teamId);
}
</script>

<template>
  <div class="flex max-w-2xl flex-col gap-4">
    <UFormField :label="$t('page.tournaments.form.name')" name="name" required>
      <UInput
        :model-value="state.name"
        class="w-full"
        autocomplete="off"
        @update:model-value="onNameInput"
      />
    </UFormField>

    <UFormField :label="$t('page.tournaments.form.event')" name="eventId" :help="eventHelp">
      <USelectMenu
        v-model="eventId"
        :items="eventOptions"
        value-key="value"
        label-key="label"
        :loading="eventsPending"
        class="w-full"
      />
    </UFormField>

    <UFormField
      v-if="showsSlug"
      :label="$t('page.tournaments.form.slug')"
      name="slug"
      :hint="$t('page.tournaments.form.slugHint')"
    >
      <UInput
        :model-value="state.slug"
        class="w-full"
        spellcheck="false"
        autocomplete="off"
        :placeholder="$t('page.tournaments.form.slugPlaceholder')"
        @update:model-value="onSlugInput"
      />
    </UFormField>

    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField :label="$t('page.tournaments.form.tier')" name="tier">
        <UInput
          :model-value="state.tier"
          class="w-full"
          :placeholder="$t('page.tournaments.form.tierPlaceholder')"
          @update:model-value="updateField('tier', $event)"
        />
      </UFormField>

      <UFormField :label="$t('page.tournaments.form.league')" name="leagueId">
        <USelect
          :model-value="state.leagueId || undefined"
          :items="leagueItems"
          value-key="value"
          label-key="label"
          class="w-full"
          :placeholder="$t('page.tournaments.form.leaguePlaceholder')"
          @update:model-value="updateField('leagueId', String($event ?? ''))"
        />
      </UFormField>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField :label="$t('page.tournaments.form.beginAt')" name="beginAt">
        <UInput
          :model-value="state.beginAt"
          type="date"
          class="w-full"
          @update:model-value="updateField('beginAt', $event)"
        />
      </UFormField>

      <UFormField :label="$t('page.tournaments.form.endAt')" name="endAt">
        <UInput
          :model-value="state.endAt"
          type="date"
          class="w-full"
          @update:model-value="updateField('endAt', $event)"
        />
      </UFormField>
    </div>

    <TournamentImageField
      v-model="imageUrl"
      :disabled="imageDisabled"
      @update:uploading="emit('update:uploading', $event)"
    />

    <UFormField
      :label="$t('page.tournaments.form.format')"
      name="format"
      :help="$t('page.tournaments.form.formatHelp')"
    >
      <USelect
        :model-value="state.format"
        :items="formatItems"
        value-key="value"
        label-key="label"
        class="w-full sm:w-40"
        @update:model-value="updateField('format', $event)"
      />
    </UFormField>

    <UFormField name="hasBracket" :help="$t('page.tournaments.form.hasBracketHelp')">
      <USwitch
        :model-value="state.hasBracket"
        :label="$t('page.tournaments.form.hasBracket')"
        @update:model-value="updateField('hasBracket', $event)"
      />
    </UFormField>

    <UFormField
      v-if="state.format !== '3v3'"
      :label="$t('page.tournaments.form.players')"
      name="playerParticipants"
      :help="$t('page.tournaments.form.playersHelp')"
    >
      <TournamentPlayerParticipants
        :model-value="state.playerParticipants"
        :format="state.format"
        @update:model-value="updateField('playerParticipants', $event)"
      />
    </UFormField>

    <UFormField
      v-if="state.format !== '1v1'"
      :label="$t('page.tournaments.form.teams')"
      name="teamIds"
    >
      <div class="flex flex-col gap-3 border border-default p-4">
        <UInput
          v-model="teamSearch"
          class="w-full"
          :placeholder="$t('page.tournaments.form.teamsSearch')"
          autocomplete="off"
        />

        <p v-if="teamsPending" class="text-sm text-muted">
          {{ $t("page.tournaments.form.teamsLoading") }}
        </p>

        <div v-else class="max-h-56 space-y-2 overflow-y-auto overscroll-contain">
          <label
            v-for="team in filteredTeams"
            :key="team.id"
            class="flex items-center gap-2 text-sm"
          >
            <UCheckbox
              :model-value="isTeamSelected(team.id)"
              @update:model-value="toggleTeam(team.id, Boolean($event))"
            />
            <span>{{ team.name }}</span>
          </label>

          <p v-if="filteredTeams.length === 0" class="text-sm text-muted">
            {{ $t("page.tournaments.form.teamsEmpty") }}
          </p>
        </div>
      </div>
    </UFormField>
  </div>
</template>
