<template>
  <SRail :title="$t('components.game.sidebarPromo.heading')">
    <div class="w-full border border-default overflow-hidden">
      <SListItem
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
      </SListItem>
      <SListItem
        size="compact"
        :to="$localePath('/game/career')"
        :title="$t('page.game.career.title')"
        class="text-xs font-normal text-default border-t border-default"
      >
        <div class="min-w-0 flex-1 truncate">{{ $t("page.game.career.title") }}</div>
        <div class="shrink-0">
          <UBadge color="primary" variant="soft" class="text-xs">
            {{ $t("components.game.sidebarPromo.play") }}
          </UBadge>
        </div>
      </SListItem>
    </div>
  </SRail>
</template>
