<script lang="ts" setup>
import type { PlayerProfileAward, PlayerSeasonAward } from "@sarpbc/types";
import { distinctStageName, tournamentStagePath } from "@sarpbc/utils";

const {
  awards,
  seasonAwards,
  pending = false,
  hasError = false,
} = defineProps<{
  awards: PlayerProfileAward[];
  seasonAwards: PlayerSeasonAward[];
  pending?: boolean;
  hasError?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t, locale } = useI18n();
const { awardTypeLabel, seasonAwardTypeLabel } = usePlayerAwardLabels();

const headingId = "player-awards-title";

const mediumDate = computed(() => mediumDateFormatter(locale.value));

const formatEndDate = (value: Date | string | null) => {
  if (!value) {
    return null;
  }

  return mediumDate.value.format(new Date(value));
};

const seasonMetaParts = (award: PlayerSeasonAward) => {
  const parts: string[] = [];

  if (award.region) {
    parts.push(award.region);
  }

  if (award.presentedBy) {
    parts.push(t("page.player.slug.awards.presentedBy", { name: award.presentedBy }));
  }

  parts.push(t("page.player.slug.awards.officialSource"));

  return parts;
};

const metaParts = (award: PlayerProfileAward) => {
  const parts: string[] = [];
  const stageName = distinctStageName(award.tournament);

  if (stageName) {
    parts.push(stageName);
  }

  if (award.tournament.endAt) {
    parts.push(
      t("page.player.slug.awards.awardedOn", {
        date: formatEndDate(award.tournament.endAt),
      }),
    );
  }

  return parts;
};
</script>

<template>
  <section :aria-labelledby="headingId">
    <HubRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t("page.player.slug.awards.title") }}
        </h2>
      </template>

      <HubCard v-if="pending" aria-live="polite">
        <HubListItem v-for="index in 2" :key="index">
          <div class="flex w-full min-w-0 items-center gap-2">
            <SSkeleton class="size-5 shrink-0" />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <SSkeleton class="h-3.5 w-3/5 max-w-48" />
              <SSkeleton class="h-3 w-2/5 max-w-32" />
            </div>
          </div>
        </HubListItem>
      </HubCard>

      <HubCard v-else-if="hasError">
        <SErrorState :message="t('page.player.slug.awards.error')" @retry="emit('retry')" />
      </HubCard>

      <HubCard v-else-if="awards.length > 0 || seasonAwards.length > 0">
        <HubListItem
          v-for="award in seasonAwards"
          :key="award.id"
          :to="award.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="min-w-0"
        >
          <div class="flex w-full min-w-0 items-center gap-2">
            <Icon name="i-fluent-star-24-filled" class="size-5 shrink-0 text-primary" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ seasonAwardTypeLabel(award.awardType) }} · {{ award.season.name }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ seasonMetaParts(award).join(" · ") }}
              </p>
            </div>
            <Icon
              name="i-fluent-open-24-regular"
              class="size-4 shrink-0 text-muted"
              aria-hidden="true"
            />
          </div>
        </HubListItem>
        <HubListItem
          v-for="award in awards"
          :key="award.id"
          :to="$localePath(tournamentStagePath(award.tournament.event.slug, award.tournament.slug))"
          class="min-w-0"
        >
          <div class="flex w-full min-w-0 items-center gap-2">
            <Icon name="i-fluent-star-24-filled" class="size-5 shrink-0 text-primary" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ awardTypeLabel(award.awardType) }} · {{ award.tournament.event.name }}
              </p>
              <p v-if="metaParts(award).length > 0" class="truncate text-xs text-muted">
                {{ metaParts(award).join(" · ") }}
              </p>
            </div>
          </div>
        </HubListItem>
      </HubCard>
    </HubRail>
  </section>
</template>
