<script lang="ts" setup>
import { DateFormatter } from "@internationalized/date";
import type { ContractRole } from "~/types/contract";

const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const route = useRoute();

const slug = computed(() => route.params.slug as string);

const { getPlayerFromSlug } = usePlayer();
const { getPlayerOldTeams } = usePlayerContract();

const { data: player } = await getPlayerFromSlug(slug);

if (!player.value) {
  throw createError({ statusCode: 404, message: "Player not found" });
}

const currentPlayer = computed(() => player.value!);
const playerId = computed(() => player.value?.id ?? "");

const { data: oldTeams } = await getPlayerOldTeams(playerId);

const df = computed(() => new DateFormatter(locale.value, { dateStyle: "medium" }));

const formatContractDate = (dateStr: string | null) =>
  dateStr ? df.value.format(new Date(dateStr)) : "-";

const roleLabel = (role: ContractRole) => t(`common.contractRole.${role}`);

const title = computed(() =>
  currentPlayer.value.name
    ? t("page.player.slug.seoTitleWithName", { name: currentPlayer.value.name })
    : t("page.player.slug.seoTitleDefault"),
);

const description = computed(() =>
  currentPlayer.value.name
    ? t("page.player.slug.seoDescriptionWithName", {
        name: currentPlayer.value.name,
      })
    : t("page.player.slug.seoDescriptionDefault"),
);

useHead({
  title,
  meta: [{ name: "description", content: description }],
});

setPageSeo({
  image: currentPlayer.value.imageUrl || undefined,
});
</script>

<template>
  <div class="w-full max-w-5xl flex flex-col items-center px-8 lg:px-0 gap-4 lg:gap-8">
    <section class="w-full">
      <div class="w-full flex flex-col items-start md:h-18">
        <h1 class="flex text-xl font-semibold">{{ currentPlayer.name }}</h1>
        <div class="flex flex-row items-center gap-2">
          <FlagIcon :nationality="currentPlayer.nationality" size="md" />
          <span class="text-muted text-sm">
            {{ `${currentPlayer.firstName} ${currentPlayer.lastName}` }}
          </span>
        </div>
      </div>
      <div class="w-full flex flex-row border border-default gap-4 p-4">
        <PlayerImg :player-name="currentPlayer.name" :img="currentPlayer.imageUrl" size="xl" />
        <div class="w-full flex flex-col">
          <div class="w-full flex flex-row justify-between">
            <span class="text-muted">{{ t("page.player.slug.age") }}</span>
            <UTooltip
              v-if="currentPlayer.birthday !== undefined"
              :content="{
                align: 'center',
                side: 'top',
                sideOffset: 4,
              }"
              :text="df.format(new Date(currentPlayer.birthday))"
            >
              <span>
                {{
                  t("page.player.slug.xYears", {
                    years: getAgeFromBirthday(new Date(currentPlayer.birthday)),
                  })
                }}
              </span>
            </UTooltip>
          </div>
          <div class="w-full flex flex-row justify-between text-muted">
            <span>
              {{ t("page.player.slug.currentTeam") }}
            </span>
            <span v-if="currentPlayer.team === undefined"> "-" </span>
            <span v-else>
              <ULink :to="`/team/${currentPlayer.team?.slug}`" class="text-default">
                {{ currentPlayer.team?.name }}
              </ULink>
            </span>
          </div>
        </div>
      </div>

      <div v-if="oldTeams && oldTeams.length > 0" class="w-full flex flex-col mt-6 gap-2">
        <h2 class="text-lg font-semibold">
          {{ t("page.player.slug.formerTeams") }}
        </h2>
        <div class="flex flex-col border border-default divide-y divide-default">
          <div
            v-for="contract in oldTeams"
            :key="contract.id"
            class="flex flex-row items-center gap-3 p-3"
          >
            <img
              v-if="contract.team.imageUrl"
              :src="contract.team.imageUrl"
              :alt="`${contract.team.name} logo`"
              class="size-8 object-contain"
              :style="contract.team.imageUrl.includes('lightmode') ? 'filter: invert(1);' : ''"
            />
            <div v-else class="size-8 bg-muted/30 flex items-center justify-center">
              <UIcon name="i-fluent-image-24-regular" class="text-muted" />
            </div>
            <div class="flex-1 min-w-0">
              <ULink
                :to="$localePath(`/team/${contract.team.slug}`)"
                class="font-medium hover:underline"
              >
                {{ contract.team.name }}
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
