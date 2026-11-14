import type { TabsItem } from "@nuxt/ui";
import type { LocationQuery } from "vue-router";
import type { EntityKind } from "~/types/entity";

const PROFILE_TABS = ["info", "matches", "events", "trophies", "earnings"] as const;

export type EntityProfileTab = (typeof PROFILE_TABS)[number];

export type EntityListTab = "upcoming" | "past";

type EntityListTabKey = "matches" | "events";

type ProfileTabQuery = {
  tab: EntityProfileTab;
  matches?: string;
  events?: string;
};

function parseProfileTab(value: LocationQuery[string] | number | undefined): EntityProfileTab {
  return PROFILE_TABS.find((tab) => tab === value) ?? "info";
}

export function useEntityTabs(kind: EntityKind) {
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const tab = computed(() => parseProfileTab(route.query.tab));

  const tabItems = computed<TabsItem[]>(() =>
    PROFILE_TABS.map((value) => ({ value, label: t(`page.${kind}.slug.tabs.${value}`) })),
  );

  function setTab(value: string | number) {
    const next = parseProfileTab(value);

    if (next === "info") {
      router.replace({ query: {} });

      return;
    }

    const query: ProfileTabQuery = { tab: next };

    if (next === "matches" || next === "events") {
      const current = route.query[next];

      if (current) {
        query[next] = String(current);
      }
    }

    router.replace({ query });
  }

  return { tab, tabItems, setTab };
}

export function useEntityListTab(key: EntityListTabKey) {
  const route = useRoute();
  const router = useRouter();

  const tab = computed<EntityListTab>(() => (route.query[key] === "past" ? "past" : "upcoming"));

  const emptyIcon = computed(() =>
    tab.value === "past"
      ? "i-fluent-checkmark-circle-24-regular"
      : "i-fluent-calendar-clock-24-regular",
  );

  function setTab(value: string | number) {
    const query = { ...route.query };

    if (value === "past") {
      query[key] = "past";
    } else {
      delete query[key];
    }

    router.replace({ query });
  }

  return { tab, emptyIcon, setTab };
}
