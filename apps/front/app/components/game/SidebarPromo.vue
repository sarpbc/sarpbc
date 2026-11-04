<template>
  <SRail :title="$t('components.game.sidebarPromo.heading')">
    <SCard class="w-full overflow-hidden">
      <SListItem
        size="compact"
        :to="$localePath('/game/airriddle')"
        :title="$t('page.game.airriddle.title')"
        class="text-xs font-normal text-default hover:text-highlighted"
      >
        <div class="min-w-0 flex-1 truncate">{{ $t("page.game.airriddle.title") }}</div>
        <span class="shrink-0 text-muted">{{ $t("components.game.sidebarPromo.play") }}</span>
      </SListItem>
      <SListItem
        size="compact"
        :to="$localePath('/game/career')"
        :title="$t('page.game.career.title')"
        class="text-xs font-normal text-default hover:text-highlighted"
      >
        <div class="min-w-0 flex-1 truncate">{{ $t("page.game.career.title") }}</div>
        <span class="shrink-0 text-muted">{{ $t("components.game.sidebarPromo.play") }}</span>
      </SListItem>
    </SCard>
  </SRail>
</template>
