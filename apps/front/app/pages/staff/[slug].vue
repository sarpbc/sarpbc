<script lang="ts" setup>
import { isStaffContractRole, playerPath, staffPath, teamPath } from "@sarpbc/utils";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const route = useRoute();
const localePath = useLocalePath();

const slug = computed(() => route.params.slug as string);

const { data: staff, error: staffError } = await useAsyncData(
  () => `staff-slug-${slug.value}`,
  async () => {
    const player = await getPlayerFromSlug(slug.value);

    return player ? { player, contracts: await getPlayerContracts(player.id) } : null;
  },
  { watch: [slug] },
);

const staffContracts = computed(() =>
  (staff.value?.contracts ?? [])
    .filter((contract) => isStaffContractRole(contract.role))
    .sort((a, b) => b.startDate.localeCompare(a.startDate)),
);

if (!staff.value || staffContracts.value.length === 0) {
  throwEntityLoadError(staffError.value, {
    notFound: t("page.staff.slug.staffNotFound"),
    failed: t("page.staff.slug.failedToLoadStaffData"),
  });
}

// A merged duplicate's slug resolves to the kept person.
if (staff.value && staff.value.player.slug !== slug.value) {
  await redirectToCanonical(route, localePath(staffPath(staff.value.player.slug)));
}

const person = computed(() => staff.value!.player);
const staffId = computed(() => person.value.id);

const currentContract = computed(() => staffContracts.value.find((contract) => !contract.endDate));

const hasPlayerCareer = computed(() =>
  (staff.value?.contracts ?? []).some((contract) => !isStaffContractRole(contract.role)),
);

const realName = computed(() =>
  [person.value.firstName, person.value.lastName].flatMap((part) => part?.trim() || []).join(" "),
);

const {
  live: liveEvents,
  upcoming: upcomingEvents,
  past: pastEvents,
  pending: eventsPending,
  error: eventsError,
  refresh: refreshEvents,
} = useStaffTournaments(staffId, staffContracts);

setPageSeo({
  title: t("page.staff.slug.seoTitleWithName", { name: person.value.name }),
  description: t("page.staff.slug.seoDescriptionWithName", { name: person.value.name }),
  image: person.value.imageUrl || undefined,
});
</script>

<template>
  <SHubPageBody>
    <div class="w-full flex min-w-0 flex-col gap-8">
      <SCrossCard class="w-full min-w-0">
        <div class="grid w-full min-w-0 self-stretch sm:grid-cols-[15rem_minmax(0,1fr)]">
          <div class="flex aspect-square items-center justify-center overflow-hidden bg-muted">
            <NuxtImg
              v-if="person.imageUrl"
              :src="person.imageUrl"
              :alt="person.name"
              width="480"
              height="480"
              sizes="100vw sm:240px"
              preload
              class="h-full w-full object-cover"
            />
            <PlayerImg v-else :player-name="person.name" size="xl" />
          </div>
          <div class="flex min-w-0 flex-col gap-1 p-6 pb-2">
            <span class="text-xs text-muted">{{ t("page.staff.slug.kicker") }}</span>
            <h1 class="mt-1 text-3xl font-medium tracking-tight text-highlighted text-balance">
              {{ person.name }}
            </h1>
            <div
              v-if="person.nationality || realName"
              class="flex min-w-0 flex-row items-center gap-2"
            >
              <FlagIcon :nationality="person.nationality" size="md" />
              <span v-if="realName" class="truncate text-sm text-muted">{{ realName }}</span>
            </div>
            <dl class="mt-auto flex w-full min-w-0 flex-col pt-6">
              <div
                class="flex h-row min-w-0 flex-row items-center justify-between gap-3 border-t border-separator"
              >
                <dt class="text-sm text-muted shrink-0">{{ t("page.staff.slug.currentTeam") }}</dt>
                <dd class="min-w-0 flex justify-end">
                  <SLink
                    v-if="currentContract"
                    :to="$localePath(teamPath(currentContract.team.slug))"
                    variant="inline"
                    class="inline-flex items-center gap-2 min-w-0 text-sm font-medium"
                  >
                    <TeamImg
                      :team-name="currentContract.team.name"
                      :logo="currentContract.team"
                      size="xs"
                    />
                    <span class="truncate">{{ currentContract.team.name }}</span>
                  </SLink>
                  <span v-else class="text-sm text-muted">
                    {{ t("page.staff.slug.noCurrentTeam") }}
                  </span>
                </dd>
              </div>
              <div
                v-if="currentContract"
                class="flex h-row min-w-0 flex-row items-center justify-between gap-3 border-t border-separator"
              >
                <dt class="text-sm text-muted shrink-0">{{ t("page.staff.slug.role") }}</dt>
                <dd class="min-w-0 text-sm font-medium">
                  {{ t(`common.contractRole.${currentContract.role}`) }}
                </dd>
              </div>
              <div
                v-if="hasPlayerCareer"
                class="flex h-row min-w-0 flex-row items-center justify-between gap-3 border-t border-separator"
              >
                <dt class="text-sm text-muted shrink-0">
                  {{ t("page.staff.slug.playerCareer") }}
                </dt>
                <dd class="min-w-0">
                  <SLink
                    :to="$localePath(playerPath(person.slug))"
                    variant="inline"
                    class="text-sm font-medium"
                  >
                    {{ t("page.staff.slug.viewPlayerProfile") }}
                  </SLink>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </SCrossCard>

      <StaffTimeline :contracts="staffContracts" />

      <EntityEventsSection
        kind="staff"
        :upcoming-events="upcomingEvents"
        :past-events="pastEvents"
        :live-events="liveEvents"
        :pending="eventsPending"
        :has-error="Boolean(eventsError)"
        @retry="refreshEvents()"
      />
    </div>
  </SHubPageBody>
</template>
