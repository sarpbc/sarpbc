<script lang="ts" setup>
import type { League } from "@sarpbc/types";
import type { EventFormState } from "~/composables/use-event-form";

const state = defineModel<EventFormState>({ required: true });
const { leagues } = defineProps<{ leagues: League[]; disabled?: boolean }>();

const { t } = useI18n();

const leagueItems = computed(() => leagueOptions(leagues, t("page.tournaments.source.pandascore")));
</script>

<template>
  <div class="flex max-w-2xl flex-col gap-4">
    <SFormField :label="$t('page.tournaments.events.form.name')" required>
      <SInput
        v-model="state.name"
        class="w-full"
        autocomplete="off"
        :disabled="disabled"
        :placeholder="$t('page.tournaments.events.form.namePlaceholder')"
      />
    </SFormField>

    <SFormField
      :label="$t('page.tournaments.form.slug')"
      :hint="$t('page.tournaments.events.form.slugHint')"
    >
      <SInput
        v-model="state.slug"
        class="w-full"
        spellcheck="false"
        autocomplete="off"
        :disabled="disabled"
        :placeholder="$t('page.tournaments.form.slugPlaceholder')"
      />
    </SFormField>

    <SFormField :label="$t('page.tournaments.form.league')">
      <div class="flex gap-2">
        <SCombobox
          v-model="state.leagueId"
          :items="leagueItems"
          class="w-full"
          :disabled="disabled"
          :placeholder="$t('page.tournaments.form.leaguePlaceholder')"
        />
        <SButton
          v-if="state.leagueId"
          variant="tertiary"
          icon="i-fluent-dismiss-24-regular"
          :title="$t('page.tournaments.events.form.clearLeague')"
          :aria-label="$t('page.tournaments.events.form.clearLeague')"
          :disabled="disabled"
          @click="state.leagueId = ''"
        />
      </div>
    </SFormField>
  </div>
</template>
