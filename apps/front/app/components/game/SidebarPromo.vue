<template>
  <div class="w-full flex flex-col">
    <div class="flex flex-col-reverse text-sm font-medium text-toned md:h-18 pl-2 pb-1">
      {{ $t("components.game.sidebarPromo.heading") }}
    </div>
    <div class="w-full border border-default overflow-hidden">
      <UButton
        :to="$localePath('/game/airriddle')"
        color="neutral"
        variant="link"
        :ui="{ base: 'rounded-none' }"
        :title="$t('page.game.airriddle.title')"
        class="w-full grid grid-cols-6 items-center px-2 py-[2.75px]! text-xs font-normal leading-5.5"
      >
        <div class="col-span-5 truncate">{{ $t("page.game.airriddle.title") }}</div>
        <div class="col-span-1 flex justify-end">
          <UBadge color="primary" variant="soft" class="text-xs">
            {{ $t("components.game.sidebarPromo.play") }}
          </UBadge>
        </div>
      </UButton>
    </div>
  </div>
</template>
