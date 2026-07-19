<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";
import { getTournamentDisplayName } from "~/utils/pickems";

const { tournament, variant = "homepage" } = defineProps<{
  tournament: Tournament;
  variant?: "homepage" | "match";
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const tournamentName = computed(() => getTournamentDisplayName(tournament));

const title = computed(() =>
  variant === "match" ? t("page.game.pickems.matchCta.title") : t("page.game.pickems.banner.title"),
);

const description = computed(() =>
  variant === "match"
    ? t("page.game.pickems.matchCta.description")
    : t("page.game.pickems.banner.description", { tournament: tournamentName.value }),
);

const ctaLabel = computed(() =>
  variant === "match" ? t("page.game.pickems.matchCta.cta") : t("page.game.pickems.banner.cta"),
);

const pickemPath = computed(() => localePath(`/game/pickems/${tournament.id}`));
</script>

<template>
  <UiCard class="border border-primary/30 bg-elevated p-4 md:p-5">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 flex-col gap-1.5">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-fluent-trophy-24-regular"
            class="shrink-0 text-lg text-primary"
            aria-hidden="true"
          />
          <h2 class="text-base font-semibold tracking-tight text-balance">
            {{ title }}
          </h2>
        </div>
        <p class="text-sm text-pretty text-muted">
          {{ description }}
        </p>
      </div>
      <UButton
        :to="pickemPath"
        color="primary"
        class="min-h-11 shrink-0 touch-manipulation self-start sm:self-center"
      >
        {{ ctaLabel }}
      </UButton>
    </div>
  </UiCard>
</template>
