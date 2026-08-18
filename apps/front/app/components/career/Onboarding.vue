<script lang="ts" setup>
import {
  CAREER_BACKGROUNDS,
  CAREER_COUNTRIES,
  CAREER_REGIONS,
  CAREER_ROLES,
  type CareerBackground,
  type CareerCountry,
  type CareerRegion,
  type CareerRole,
  type OnboardingStep,
} from "~/types/career";

const props = defineProps<{
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

const localName = computed({
  get: () => props.playerName,
  set: (value: string) => emit("update:playerName", value),
});

const countriesForRegion = computed<readonly CareerCountry[]>(() =>
  props.region ? CAREER_COUNTRIES[props.region] : [],
);

function goTo(step: OnboardingStep) {
  emit("update:step", step);
}

function onIntroNext() {
  if (!props.playerName.trim()) return;
  goTo("region");
}

function onRegionNext() {
  if (props.region) goTo("country");
}

function onCountryNext() {
  if (props.country) goTo("role");
}

function onRoleNext() {
  if (props.role) goTo("background");
}

function onStart() {
  if (props.background) emit("complete");
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="step === 'intro'" class="flex flex-col gap-4">
      <div class="space-y-2 text-center">
        <h2 class="text-lg font-semibold tracking-tight">
          {{ t("page.game.career.onboarding.introTitle") }}
        </h2>
        <p class="text-sm text-muted">{{ t("page.game.career.onboarding.introBody") }}</p>
      </div>
      <UForm
        :state="{ playerName: localName }"
        class="flex w-full flex-col gap-4"
        @submit="onIntroNext"
      >
        <UFormField
          class="w-full"
          :label="t('page.game.career.onboarding.playerNameLabel')"
          name="playerName"
        >
          <UInput
            v-model="localName"
            class="w-full"
            :placeholder="t('page.game.career.onboarding.playerNamePlaceholder')"
            maxlength="24"
            autocomplete="nickname"
            spellcheck="false"
          />
        </UFormField>
        <UButton type="submit" block>
          {{ t("page.game.career.onboarding.next") }}
        </UButton>
      </UForm>
    </div>

    <div v-else-if="step === 'region'" class="flex flex-col gap-4">
      <div class="space-y-2 text-center">
        <h2 class="text-lg font-semibold tracking-tight">
          {{ t("page.game.career.onboarding.regionTitle") }}
        </h2>
        <p class="text-sm text-muted">{{ t("page.game.career.onboarding.regionBody") }}</p>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <UButton
          v-for="regionOption in CAREER_REGIONS"
          :key="regionOption"
          :variant="props.region === regionOption ? 'solid' : 'outline'"
          @click="emit('selectRegion', regionOption)"
        >
          {{ t(`page.game.career.onboarding.regions.${regionOption}`) }}
        </UButton>
      </div>
      <UButton block :disabled="!region" @click="onRegionNext">
        {{ t("page.game.career.onboarding.next") }}
      </UButton>
    </div>

    <div v-else-if="step === 'country'" class="flex flex-col gap-4">
      <div class="space-y-2 text-center">
        <h2 class="text-lg font-semibold tracking-tight">
          {{ t("page.game.career.onboarding.countryTitle") }}
        </h2>
        <p class="text-sm text-muted">{{ t("page.game.career.onboarding.countryBody") }}</p>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <UButton
          v-for="countryOption in countriesForRegion"
          :key="countryOption"
          :variant="props.country === countryOption ? 'solid' : 'outline'"
          @click="emit('selectCountry', countryOption)"
        >
          {{ t(`page.game.career.onboarding.countries.${countryOption}`) }}
        </UButton>
      </div>
      <UButton block :disabled="!country" @click="onCountryNext">
        {{ t("page.game.career.onboarding.next") }}
      </UButton>
    </div>

    <div v-else-if="step === 'role'" class="flex flex-col gap-4">
      <div class="space-y-2 text-center">
        <h2 class="text-lg font-semibold tracking-tight">
          {{ t("page.game.career.onboarding.roleTitle") }}
        </h2>
        <p class="text-sm text-muted">{{ t("page.game.career.onboarding.roleBody") }}</p>
      </div>
      <div class="flex flex-col gap-2">
        <button
          v-for="roleOption in CAREER_ROLES"
          :key="roleOption"
          type="button"
          class="border border-default p-4 text-left transition-colors hover:bg-elevated"
          :class="props.role === roleOption ? 'ring-2 ring-primary' : ''"
          @click="emit('selectRole', roleOption)"
        >
          <p class="font-semibold">
            {{ t(`page.game.career.onboarding.roles.${roleOption}.label`) }}
          </p>
          <p class="mt-1 text-sm text-muted">
            {{ t(`page.game.career.onboarding.roles.${roleOption}.description`) }}
          </p>
        </button>
      </div>
      <UButton block :disabled="!role" @click="onRoleNext">
        {{ t("page.game.career.onboarding.next") }}
      </UButton>
    </div>

    <div v-else-if="step === 'background'" class="flex flex-col gap-4">
      <div class="space-y-2 text-center">
        <h2 class="text-lg font-semibold tracking-tight">
          {{ t("page.game.career.onboarding.backgroundTitle") }}
        </h2>
        <p class="text-sm text-muted">{{ t("page.game.career.onboarding.backgroundBody") }}</p>
      </div>
      <div class="flex flex-col gap-2">
        <button
          v-for="bg in CAREER_BACKGROUNDS"
          :key="bg"
          type="button"
          class="border border-default p-4 text-left transition-colors hover:bg-elevated"
          :class="props.background === bg ? 'ring-2 ring-primary' : ''"
          @click="emit('selectBackground', bg)"
        >
          <p class="font-semibold">
            {{ t(`page.game.career.onboarding.backgrounds.${bg}.label`) }}
          </p>
          <p class="mt-1 text-sm text-muted">
            {{ t(`page.game.career.onboarding.backgrounds.${bg}.description`) }}
          </p>
        </button>
      </div>
      <UButton block :disabled="!background" @click="onStart">
        {{ t("page.game.career.onboarding.startCareer") }}
      </UButton>
    </div>
  </div>
</template>
