<template>
  <div class="w-full h-dvh flex flex-col overflow-hidden">
    <div
      class="w-full h-16 flex flex-row justify-between items-center pl-8 pr-4 py-2 border-b border-default shrink-0"
    >
      <div>
        <slot name="breadcrumb" />
      </div>
      <div class="w-fit flex flex-row gap-2">
        <slot name="action" />
      </div>
    </div>
    <div class="flex-1 overflow-y-auto">
      <slot />
    </div>
  </div>
</template>
