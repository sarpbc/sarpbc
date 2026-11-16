<script lang="ts" setup>
import { CAREER_BACKGROUNDS, CAREER_COUNTRIES, CAREER_REGIONS, CAREER_ROLES } from "~/types/career";
import type {
  CareerBackground,
  CareerCountry,
  CareerRegion,
  CareerRole,
  OnboardingStep,
} from "~/types/career";

const { step, playerName, region, country, role, background } = defineProps<{
  step: OnboardingStep;
  playerName: string;
  region: CareerRegion | null;
  country: CareerCountry | null;
  role: CareerRole | null;
  background: CareerBackground | null;
}>();

const emit = defineEmits<{
  "update:playerName": [value: string];
  "update:step": [value: OnboardingStep];
  selectRegion: [value: CareerRegion];
  selectCountry: [value: CareerCountry];
  selectRole: [value: CareerRole];
  selectBackground: [value: CareerBackground];
  complete: [];
}>();

const { t } = useI18n();

const roleItems = computed(() =>
  CAREER_ROLES.map((value) => ({
    description: t(`page.game.career.onboarding.roles.${value}.description`),
    label: t(`page.game.career.onboarding.roles.${value}.label`),
    value,
  })),
);

const backgroundItems = computed(() =>
  CAREER_BACKGROUNDS.map((value) => ({
    description: t(`page.game.career.onboarding.backgrounds.${value}.description`),
    label: t(`page.game.career.onboarding.backgrounds.${value}.label`),
    value,
  })),
);

const localName = computed({
  get: () => playerName,
  set: (value: string) => emit("update:playerName", value),
});

const countriesForRegion = computed<readonly CareerCountry[]>(() =>
  region ? CAREER_COUNTRIES[region] : [],
);

const goTo = (nextStep: OnboardingStep) => {
  emit("update:step", nextStep);
};

const onIntroNext = () => {
  if (!playerName.trim()) {
    return;
  }

  goTo("region");
};

const onRegionNext = () => {
  if (region) {
    goTo("country");
  }
};

const onCountryNext = () => {
  if (country) {
    goTo("role");
  }
};

const onRoleNext = () => {
  if (role) {
    goTo("background");
  }
};

const onStart = () => {
  if (background) {
    emit("complete");
  }
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="step === 'intro'" class="flex flex-col gap-4">
      <div class="space-y-2 text-center">
        <h2 class="text-lg font-medium tracking-tight">
          {{ t("page.game.career.onboarding.introTitle") }}
        </h2>
        <p class="text-sm text-muted">{{ t("page.game.career.onboarding.introBody") }}</p>
      </div>
      <form class="flex w-full flex-col gap-4" @submit.prevent="onIntroNext">
        <SFormField class="w-full" :label="t('page.game.career.onboarding.playerNameLabel')">
          <SInput
            v-model="localName"
            class="w-full"
            :placeholder="t('page.game.career.onboarding.playerNamePlaceholder')"
            maxlength="24"
            autocomplete="nickname"
            spellcheck="false"
          />
        </SFormField>
        <SButton type="submit" block>
          {{ t("page.game.career.onboarding.next") }}
        </SButton>
      </form>
    </div>

    <div v-else-if="step === 'region'" class="flex flex-col gap-4">
      <div class="space-y-2 text-center">
        <h2 class="text-lg font-medium tracking-tight">
          {{ t("page.game.career.onboarding.regionTitle") }}
        </h2>
        <p class="text-sm text-muted">{{ t("page.game.career.onboarding.regionBody") }}</p>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <SButton
          v-for="regionOption in CAREER_REGIONS"
          :key="regionOption"
          variant="secondary"
          class="selectable"
          :aria-pressed="region === regionOption"
          @click="emit('selectRegion', regionOption)"
        >
          {{ t(`page.game.career.onboarding.regions.${regionOption}`) }}
        </SButton>
      </div>
      <SButton block :disabled="!region" @click="onRegionNext">
        {{ t("page.game.career.onboarding.next") }}
      </SButton>
    </div>

    <div v-else-if="step === 'country'" class="flex flex-col gap-4">
      <div class="space-y-2 text-center">
        <h2 class="text-lg font-medium tracking-tight">
          {{ t("page.game.career.onboarding.countryTitle") }}
        </h2>
        <p class="text-sm text-muted">{{ t("page.game.career.onboarding.countryBody") }}</p>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <SButton
          v-for="countryOption in countriesForRegion"
          :key="countryOption"
          variant="secondary"
          class="selectable"
          :aria-pressed="country === countryOption"
          @click="emit('selectCountry', countryOption)"
        >
          {{ t(`page.game.career.onboarding.countries.${countryOption}`) }}
        </SButton>
      </div>
      <SButton block :disabled="!country" @click="onCountryNext">
        {{ t("page.game.career.onboarding.next") }}
      </SButton>
    </div>

    <div v-else-if="step === 'role'" class="flex flex-col gap-4">
      <div class="space-y-2 text-center">
        <h2 class="text-lg font-medium tracking-tight">
          {{ t("page.game.career.onboarding.roleTitle") }}
        </h2>
        <p class="text-sm text-muted">{{ t("page.game.career.onboarding.roleBody") }}</p>
      </div>
      <SRadioGroup
        :model-value="role"
        :items="roleItems"
        :aria-label="t('page.game.career.onboarding.roleTitle')"
        @update:model-value="$event !== null && emit('selectRole', $event)"
      />
      <SButton block :disabled="!role" @click="onRoleNext">
        {{ t("page.game.career.onboarding.next") }}
      </SButton>
    </div>

    <div v-else-if="step === 'background'" class="flex flex-col gap-4">
      <div class="space-y-2 text-center">
        <h2 class="text-lg font-medium tracking-tight">
          {{ t("page.game.career.onboarding.backgroundTitle") }}
        </h2>
        <p class="text-sm text-muted">{{ t("page.game.career.onboarding.backgroundBody") }}</p>
      </div>
      <SRadioGroup
        :model-value="background"
        :items="backgroundItems"
        :aria-label="t('page.game.career.onboarding.backgroundTitle')"
        @update:model-value="$event !== null && emit('selectBackground', $event)"
      />
      <SButton block :disabled="!background" @click="onStart">
        {{ t("page.game.career.onboarding.startCareer") }}
      </SButton>
    </div>
  </div>
</template>
