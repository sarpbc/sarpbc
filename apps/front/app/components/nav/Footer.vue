<template>
  <footer class="w-full flex flex-row border-t border-default py-8 md:py-16">
    <div
      class="w-full max-w-7xl px-8 mx-auto flex flex-col md:grid grid-cols-3 items-start gap-8 md:gap-4 text-sm"
    >
      <div class="flex flex-col gap-2 col-span-1">
        <span class="font-semibold text-dimmed"> {{ new Date().getFullYear() }} sarpbc </span>

        <span class="text-muted">
          Data &amp; images: <span class="italic">Source: Pandascore</span>
        </span>
        <ULink to="https://x.com/SARPBCorg" class="h-6!" aria-label="sarpbc X / Twitter account">
          <UIcon name="i-ri-twitter-x-fill" class="h-6 w-6" />
        </ULink>
      </div>
      <div class="flex flex-col gap-2 col-span-1">
        <ULink :to="$localePath('/cookie-policy')" class="text-muted">
          {{ $t("components.footer.cookiePolicy") }}
        </ULink>
        <ULink :to="$localePath('/legal-notice')" class="text-muted">
          {{ $t("components.footer.legalNotice") }}
        </ULink>
        <ULink :to="$localePath('/privacy-policy')" class="text-muted">
          {{ $t("components.footer.privacyPolicy") }}
        </ULink>
        <ULink :to="$localePath('/terms-of-service')" class="text-muted">
          {{ $t("components.footer.termsOfService") }}
        </ULink>
      </div>
      <div class="flex flex-row-reverse gap-2 col-span-1">
        <SettingsLanguageSelect />
        <SettingsThemeSelect />
      </div>
    </div>
  </footer>
</template>
