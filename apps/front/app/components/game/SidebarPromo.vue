<template>
  <UiRail :title="$t('components.game.sidebarPromo.heading')">
    <div class="w-full border border-default overflow-hidden">
      <UiListItem
        size="compact"
        :to="$localePath('/game/airriddle')"
        :title="$t('page.game.airriddle.title')"
        class="text-xs font-normal text-default"
      >
        <div class="min-w-0 flex-1 truncate">{{ $t("page.game.airriddle.title") }}</div>
        <div class="shrink-0">
          <UBadge color="primary" variant="soft" class="text-xs">
            {{ $t("components.game.sidebarPromo.play") }}
          </UBadge>
        </div>
      </UiListItem>
    </div>
  </UiRail>
</template>
