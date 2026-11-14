import { visibleAdminSections } from "~/utils/admin-sections";

export function useAdminSections() {
  const { t } = useI18n();
  const localePath = useLocalePath();
  const user = useUser();

  return computed(() =>
    visibleAdminSections(user.value).map((section) => ({
      label: t(section.label),
      icon: section.icon,
      to: localePath(section.path),
    })),
  );
}

export function useAdminNavLinks() {
  const { t } = useI18n();
  const localePath = useLocalePath();
  const sections = useAdminSections();
  const config = useRuntimeConfig();

  return computed(() => [
    {
      label: t("page.nav.home"),
      icon: "i-fluent-home-24-regular",
      to: localePath("/"),
    },
    ...sections.value,
    {
      label: t("page.nav.backToSite"),
      icon: "i-fluent-arrow-left-24-regular",
      to: config.public.publicSiteUrl,
      target: "_blank",
    },
  ]);
}
