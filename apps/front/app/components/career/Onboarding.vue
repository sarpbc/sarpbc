<script lang="ts" setup>
import {
  CAREER_BACKGROUNDS,
  CAREER_REGIONS,
  CAREER_ROLES,
  type CareerBackground,
  type CareerRegion,
  type CareerRole,
  type OnboardingStep,
} from "~/types/career";

const props = defineProps<{
  step: OnboardingStep;
  playerName: string;
  region: CareerRegion | null;
  role: CareerRole | null;
  background: CareerBackground | null;
}>();

const emit = defineEmits<{
  "update:playerName": [value: string];
  "update:step": [value: OnboardingStep];
  selectRegion: [value: CareerRegion];
  selectRole: [value: CareerRole];
  selectBackground: [value: CareerBackground];
  complete: [];
}>();

const { t } = useI18n();

const localName = computed({
  get: () => props.playerName,
  set: (value: string) => emit("update:playerName", value),
});

function goTo(step: OnboardingStep) {
  emit("update:step", step);
}

function onIntroNext() {
  goTo("region");
}

function onRegionNext() {
  if (props.region) goTo("role");
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
        <p class="text-sm text-muted text-pretty">
          {{ t("page.game.career.onboarding.introBody") }}
        </p>
      </div>
      <UFormField :label="t('page.game.career.onboarding.playerNameLabel')" name="playerName">
        <UInput
          v-model="localName"
          :placeholder="t('page.game.career.onboarding.playerNamePlaceholder')"
          maxlength="24"
          autocomplete="nickname"
        />
      </UFormField>
      <UButton block @click="onIntroNext">
        {{ t("page.game.career.onboarding.next") }}
      </UButton>
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
          v-for="region in CAREER_REGIONS"
          :key="region"
          :variant="props.region === region ? 'solid' : 'outline'"
          @click="emit('selectRegion', region)"
        >
          {{ t(`page.game.career.onboarding.regions.${region}`) }}
        </UButton>
      </div>
      <UButton block :disabled="!region" @click="onRegionNext">
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
      <div class="grid grid-cols-2 gap-2">
        <UButton
          v-for="roleOption in CAREER_ROLES"
          :key="roleOption"
          :variant="props.role === roleOption ? 'solid' : 'outline'"
          @click="emit('selectRole', roleOption)"
        >
          {{ t(`page.game.career.onboarding.roles.${roleOption}`) }}
        </UButton>
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
