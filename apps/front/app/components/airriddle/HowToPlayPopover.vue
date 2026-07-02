<script lang="ts" setup>
import AirRiddleLegendTile from "~/components/airriddle/LegendTile.vue";

const { t } = useI18n();

const open = ref(false);
const dialogId = "airriddle-how-to-play-dialog";
const titleId = "airriddle-how-to-play-title";
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      variant="ghost"
      color="neutral"
      size="sm"
      class="size-9 min-h-9 min-w-9 p-0 font-semibold tabular-nums"
      :aria-label="t('page.game.airriddle.howToPlayLabel')"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :aria-controls="dialogId"
    >
      ?
    </UButton>

    <template #content>
      <div
        :id="dialogId"
        class="flex w-64 flex-col gap-3 p-4 sm:w-72"
        role="dialog"
        :aria-labelledby="titleId"
      >
        <p :id="titleId" class="text-sm font-semibold tracking-tight text-highlighted">
          {{ t("page.game.airriddle.howToPlay") }}
        </p>
        <ul class="flex flex-col gap-2.5">
          <li class="flex items-center gap-2">
            <AirRiddleLegendTile tone="success" />
            <span class="text-sm text-muted">
              {{ t("page.game.airriddle.correctPosition") }}
            </span>
          </li>
          <li class="flex items-center gap-2">
            <AirRiddleLegendTile tone="warning" />
            <span class="text-sm text-muted">
              {{ t("page.game.airriddle.wrongPosition") }}
            </span>
          </li>
          <li class="flex items-center gap-2">
            <AirRiddleLegendTile tone="accented" />
            <span class="text-sm text-muted">
              {{ t("page.game.airriddle.notInWord") }}
            </span>
          </li>
        </ul>
      </div>
    </template>
  </UPopover>
</template>
