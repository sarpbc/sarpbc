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

      <div v-if="pending" class="flex flex-col gap-2" aria-live="polite">
        <SCard v-for="index in 2" :key="index">
          <div class="flex items-center gap-3 py-2 px-3">
            <USkeleton class="size-10 shrink-0" />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <USkeleton class="h-4 w-3/5 max-w-48" />
              <USkeleton class="h-3 w-2/5 max-w-32" />
            </div>
          </div>
        </SCard>
      </div>

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

      <div
        v-else-if="awards.length > 0"
        class="flex flex-col border border-default divide-y divide-default"
      >
        <ULink
          v-for="award in awards"
          :key="award.id"
          :to="$localePath(`/tournaments/${award.tournament.id}`)"
          class="flex items-center gap-3 p-3 hover:bg-elevated transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        >
          <div class="flex size-10 shrink-0 items-center justify-center">
            <UIcon name="i-fluent-star-24-filled" class="text-xl text-primary" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">
              {{ awardTypeLabel(award.awardType) }} · {{ award.tournament.name }}
            </p>
            <p v-if="metaParts(award).length > 0" class="text-sm text-muted truncate">
              {{ metaParts(award).join(" · ") }}
            </p>
          </div>
        </ULink>
      </div>
    </SRail>
  </section>
</template>
