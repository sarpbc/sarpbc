<script lang="ts" setup>
import type { ManualTournamentFormState } from "~/composables/useManualTournamentForm";
import type { Team } from "~/types/team";
import type { TournamentLeagueOption } from "~/composables/tournaments";

const props = defineProps<{
  modelValue: ManualTournamentFormState;
  leagues: TournamentLeagueOption[];
  teams: Team[];
  teamsPending?: boolean;
  slugAuto?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [ManualTournamentFormState];
  "update:slugAuto": [boolean];
}>();

const { t } = useI18n();

const state = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const leagueOptions = computed(() =>
  props.leagues.map((league) => ({
    value: league.id,
    label: league.name,
  })),
);

const teamSearch = ref("");

const filteredTeams = computed(() => {
  const query = teamSearch.value.trim().toLowerCase();
  if (!query) {
    return props.teams;
  }
  return props.teams.filter((team) => team.name.toLowerCase().includes(query));
});

function updateField<K extends keyof ManualTournamentFormState>(
  key: K,
  value: ManualTournamentFormState[K],
) {
  emit("update:modelValue", { ...props.modelValue, [key]: value });
}

function onNameInput(value: string) {
  updateField("name", value);
  if (props.slugAuto) {
    updateField("slug", suggestTournamentSlug(value));
  }
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
  updateField("teamIds", Array.from(next));
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

    <UFormField
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
          :items="leagueOptions"
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

    <UFormField :label="$t('page.tournaments.form.imageUrl')" name="imageUrl">
      <UInput
        :model-value="state.imageUrl"
        type="url"
        class="w-full"
        spellcheck="false"
        autocomplete="off"
        :placeholder="$t('page.tournaments.form.imageUrlPlaceholder')"
        @update:model-value="updateField('imageUrl', $event)"
      />
    </UFormField>

    <UFormField :label="$t('page.tournaments.form.teams')" name="teamIds">
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
            class="flex cursor-pointer items-center gap-2 text-sm"
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
