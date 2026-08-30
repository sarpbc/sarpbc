<script lang="ts" setup>
import { DateFormatter } from "@internationalized/date";
import { PlayerAwardTypes, type PlayerAwardType, type PlayerProfileAward } from "@sarpbc/types";

const {
  awards,
  pending = false,
  hasError = false,
} = defineProps<{
  awards: PlayerProfileAward[];
  pending?: boolean;
  hasError?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t, locale } = useI18n();

const headingId = "player-awards-title";

const dateDf = computed(
  () =>
    new DateFormatter(locale.value, {
      dateStyle: "medium",
    }),
);

const formatEndDate = (value: Date | string | null) => {
  if (!value) return null;
  return dateDf.value.format(new Date(value));
};

function awardTypeLabel(awardType: PlayerAwardType): string {
  switch (awardType) {
    case PlayerAwardTypes.MVP:
      return t("page.player.slug.awards.types.mvp");
    case PlayerAwardTypes.DEFENSIVE_MVP:
      return t("page.player.slug.awards.types.defensive_mvp");
    default: {
      const _exhaustive: never = awardType;
      return _exhaustive;
    }
  }
}

function metaParts(award: PlayerProfileAward): string[] {
  const parts: string[] = [];
  if (award.tournament.leagueName) {
    parts.push(award.tournament.leagueName);
  }
  if (award.tournament.serie) {
    parts.push(award.tournament.serie);
  }
  if (award.tournament.endAt) {
    parts.push(
      t("page.player.slug.awards.awardedOn", {
        date: formatEndDate(award.tournament.endAt),
      }),
    );
  }
  return parts;
}
</script>

<template>
  <section :aria-labelledby="headingId">
    <SRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t("page.player.slug.awards.title") }}
        </h2>
      </template>

      <SCard v-if="pending" flush-bottom aria-live="polite">
        <SListItem v-for="index in 2" :key="index" divider>
          <div class="flex w-full min-w-0 items-center gap-2">
            <USkeleton class="size-5 shrink-0" />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <USkeleton class="h-3.5 w-3/5 max-w-48" />
              <USkeleton class="h-3 w-2/5 max-w-32" />
            </div>
          </div>
        </SListItem>
      </SCard>

      <SCard v-else-if="hasError">
        <div class="flex flex-col items-center gap-3 py-8 px-4 text-center">
          <UIcon name="i-fluent-warning-24-regular" class="text-3xl text-muted" />
          <p class="text-sm text-muted text-pretty">
            {{ t("page.player.slug.awards.error") }}
          </p>
          <UButton variant="outline" color="error" @click="emit('retry')">
            {{ t("page.player.slug.awards.retry") }}
          </UButton>
        </div>
      </SCard>

      <SCard v-else-if="awards.length > 0" flush-bottom>
        <SListItem
          v-for="award in awards"
          :key="award.id"
          divider
          :to="$localePath(`/tournaments/${award.tournament.id}`)"
          class="min-w-0"
        >
          <div class="flex w-full min-w-0 items-center gap-2">
            <UIcon name="i-fluent-star-24-filled" class="size-5 shrink-0 text-primary" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium leading-none text-highlighted">
                {{ awardTypeLabel(award.awardType) }} · {{ award.tournament.name }}
              </p>
              <p
                v-if="metaParts(award).length > 0"
                class="truncate text-xs leading-none text-dimmed"
              >
                {{ metaParts(award).join(" · ") }}
              </p>
            </div>
          </div>
        </SListItem>
      </SCard>
    </SRail>
  </section>
</template>
