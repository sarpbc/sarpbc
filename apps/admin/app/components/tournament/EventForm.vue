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
    <UFormField :label="$t('page.tournaments.events.form.name')" name="name" required>
      <UInput
        v-model="state.name"
        class="w-full"
        autocomplete="off"
        :disabled="disabled"
        :placeholder="$t('page.tournaments.events.form.namePlaceholder')"
      />
    </UFormField>

    <UFormField
      :label="$t('page.tournaments.form.slug')"
      name="slug"
      :hint="$t('page.tournaments.events.form.slugHint')"
    >
      <UInput
        v-model="state.slug"
        class="w-full"
        spellcheck="false"
        autocomplete="off"
        :disabled="disabled"
        :placeholder="$t('page.tournaments.form.slugPlaceholder')"
      />
    </UFormField>

    <UFormField :label="$t('page.tournaments.form.league')" name="leagueId">
      <div class="flex gap-2">
        <USelectMenu
          v-model="state.leagueId"
          :items="leagueItems"
          value-key="value"
          label-key="label"
          class="w-full"
          :disabled="disabled"
          :placeholder="$t('page.tournaments.form.leaguePlaceholder')"
        />
        <UButton
          v-if="state.leagueId"
          variant="ghost"
          color="neutral"
          icon="i-fluent-dismiss-24-regular"
          :title="$t('page.tournaments.events.form.clearLeague')"
          :aria-label="$t('page.tournaments.events.form.clearLeague')"
          :disabled="disabled"
          @click="state.leagueId = ''"
        />
      </div>
    </UFormField>
  </div>
</template>
