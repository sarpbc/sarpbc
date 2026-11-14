import { visibleAdminSections } from "~/utils/admin-sections";

export const useAdminSections = () => {
  const { t } = useI18n();
  const localePath = useLocalePath();
  const user = useUser();

  return computed(() =>
    visibleAdminSections(user.value).map((section) => ({
      icon: section.icon,
      label: t(section.label),
      to: localePath(section.path),
    })),
  );
};

export const useAdminNavLinks = () => {
  const { t } = useI18n();
  const localePath = useLocalePath();
  const sections = useAdminSections();
  const config = useRuntimeConfig();

  return computed(() => [
    {
      icon: "i-fluent-home-24-regular",
      label: t("page.nav.home"),
      to: localePath("/"),
    },
    ...sections.value,
    {
      icon: "i-fluent-arrow-left-24-regular",
      label: t("page.nav.backToSite"),
      target: "_blank",
      to: config.public.publicSiteUrl,
    },
  ]);
};
