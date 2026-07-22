<template>
  <div class="flex h-dvh w-full flex-col overflow-hidden">
    <div
      class="flex h-16 w-full shrink-0 flex-row items-center justify-between border-b border-default py-2 pr-4 pl-8"
    >
      <div>
        <slot name="breadcrumb" />
      </div>
      <div class="flex w-fit flex-row gap-2">
        <slot name="action" />
      </div>
    </div>
    <div class="flex-1 overflow-y-auto">
      <slot />
    </div>
  </div>
</template>
