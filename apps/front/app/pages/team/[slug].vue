<script lang="ts" setup>
import { DateFormatter } from "@internationalized/date";
import type { ContractRole } from "~/types/contract";

const route = useRoute();
const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const slug = computed(() => route.params.slug as string);

const {
  data: team,
  pending,
  error,
} = await useLazyAsyncData(`team-${slug.value}`, () => getTeamFromSlug(slug.value));

const { data: formerPlayers } = await useLazyAsyncData(
  `team-former-players-${slug.value}`,
  async () => {
    if (!team.value?.id) return [];
    return getTeamFormerPlayers(team.value.id);
  },
  { watch: [team] },
);

const teamNationalities = computed(() => {
  if (!team.value?.players?.length) return [];

  return team.value.players
    .map((player) => player.nationality)
    .filter(
      (nationality): nationality is string => nationality != null && nationality.trim() !== "",
    );
});

const title = computed(() =>
  team.value?.name
    ? t("page.team.slug.seoTitleWithName", { name: team.value.name })
    : t("page.team.slug.seoTitleDefault"),
);
const description = computed(() =>
  team.value?.name
    ? t("page.team.slug.seoDescriptionWithName", { name: team.value.name })
    : t("page.team.slug.seoDescriptionDefault"),
);

const contractDateDf = new DateFormatter(locale.value, {
  dateStyle: "medium",
});

const formatContractDate = (dateStr: string | null) =>
  dateStr ? contractDateDf.format(new Date(dateStr)) : "-";

const roleLabel = (role: ContractRole) => t(`common.contractRole.${role}`);

setPageSeo({
  title: title.value,
  description: description.value,
  image: team.value?.imageUrl || undefined,
});
</script>

<template>
  <div class="w-full max-w-5xl flex flex-col items-center px-8 lg:px-0 gap-4 lg:gap-8">
    <div v-if="pending" class="w-full flex justify-center py-16">
      <div class="flex items-center gap-3 text-muted">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        {{ $t("page.team.slug.loadingTeam") }}
      </div>
    </div>

    <div v-else-if="error" class="w-full flex flex-col items-center py-16 text-center">
      <h1 class="text-2xl font-bold text-error mb-4">
        {{ $t("page.team.slug.errorLoadingTeam") }}
      </h1>
      <p class="text-muted">
        {{ error.message || $t("page.team.slug.failedToLoadTeamData") }}
      </p>
    </div>

    <div
      v-else-if="!pending && !team && !error"
      class="w-full flex flex-col items-center py-16 text-center"
    >
      <h1 class="text-2xl font-bold text-muted mb-4">
        {{ $t("page.player.slug.playerNotFound") }}
      </h1>
      <p class="text-muted mb-6">
        {{ $t("page.player.slug.playerCouldNotBeFound", { slug }) }}
      </p>
      <UButton :to="$localePath('/')" variant="outline">
        {{ $t("page.player.slug.goBackToHome") }}
      </UButton>
    </div>

    <section v-else-if="team" class="w-full">
      <div class="w-full flex flex-row items-center gap-2 md:h-18 justify-start">
        <img
          v-if="team.imageUrl"
          :src="team.imageUrl"
          :alt="`${team.name} logo`"
          class="size-12"
          :style="team.imageUrl.includes('lightmode') ? 'filter: invert(1);' : ''"
        />
        <div class="h-full flex flex-col">
          <h1 class="flex text-xl font-semibold">{{ team.name }}</h1>
          <div v-if="teamNationalities.length > 0" class="flex items-center gap-2 mt-1">
            <FlagNationalities
              :nationalities="teamNationalities"
              size="lg"
              :fallback-to-continent="true"
            />
          </div>
        </div>
      </div>

      <div
        v-if="team.players?.length"
        class="flex flex-row justify-between items-center gap-4 border border-default p-4"
      >
        <PlayerProfile v-for="player in team.players" :key="player.id" :player="player" size="lg" />
      </div>

      <div v-if="formerPlayers && formerPlayers.length > 0" class="w-full flex flex-col mt-6 gap-2">
        <h2 class="text-lg font-semibold">
          {{ t("page.team.slug.formerPlayers") }}
        </h2>
        <div class="flex flex-col border border-default divide-y divide-default">
          <div
            v-for="contract in formerPlayers"
            :key="contract.id"
            class="flex flex-row items-center gap-3 p-3"
          >
            <PlayerImg
              :player-name="contract.player.name"
              :img="contract.player.imageUrl || undefined"
              size="sm"
            />
            <div class="flex-1 min-w-0">
              <ULink
                :to="$localePath(`/player/${contract.player.slug}`)"
                class="font-medium hover:underline"
              >
                {{ contract.player.name }}
              </ULink>
              <div class="text-sm text-muted">
                <span>{{ roleLabel(contract.role) }}</span>
                <span class="mx-1">·</span>
                <span
                  >{{ formatContractDate(contract.startDate) }} →
                  {{ formatContractDate(contract.endDate) }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
