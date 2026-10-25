<script lang="ts" setup>
import { getApiErrorMessage } from "~/utils/apiError";
import { hasPermission, meetsRequirement, ROSTER_PROPOSAL_PERMISSIONS } from "~/utils/staff";

const MODERATION_LIMIT = 50;
const ARTICLE_LIMIT = 5;
const MATCH_LIMIT = 5;

const { t, locale } = useI18n();
const localePath = useLocalePath();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const user = useUser();
const navLinks = useAdminNavLinks();

const items = [{ label: t("page.nav.home") }];

const canNews = computed(() => hasPermission(user.value, "news.manage"));
const canMatches = computed(() => hasPermission(user.value, "tournaments.manage"));
const canProposals = computed(() => meetsRequirement(user.value, ROSTER_PROPOSAL_PERMISSIONS));
const canModeration = computed(() => hasPermission(user.value, "forum.moderate"));

const shortcuts = computed(() =>
  navLinks.value.filter((link) => !link.target && link.to !== localePath("/")),
);

const hasAnyTool = computed(() => shortcuts.value.length > 0);

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
);

function formatDate(value: string | null): string {
  return value ? dateFormatter.value.format(new Date(value)) : t("page.home.dateUnknown");
}

const proposals = useLazyAsyncData("admin-home-proposals", () => getPendingRosterProposals(), {
  server: false,
  immediate: canProposals.value,
});
const replies = useLazyAsyncData(
  "admin-home-replies",
  () => getModerationReplies(MODERATION_LIMIT),
  { server: false, immediate: canModeration.value },
);
const articles = useLazyAsyncData(
  "admin-home-articles",
  () => getRecentNewsArticles(ARTICLE_LIMIT),
  { server: false, immediate: canNews.value },
);
const matches = useLazyAsyncData("admin-home-matches", () => getUpcomingMatches(MATCH_LIMIT), {
  server: false,
  immediate: canMatches.value,
});

const proposalCount = computed(() => proposals.data.value?.proposals.length ?? 0);
const replyCount = computed(() => replies.data.value?.length ?? 0);
const replyCountLabel = computed(() =>
  replyCount.value >= MODERATION_LIMIT ? `${MODERATION_LIMIT}+` : String(replyCount.value),
);

function matchTitle(participants: { team: { name: string } }[]): string {
  return (
    participants.map((participant) => participant.team.name).join(" vs ") || t("page.home.tbd")
  );
}

onMounted(() => {
  if (route.query.forbidden === "1") {
    toast.add({
      title: t("page.home.forbidden"),
      color: "warning",
    });
    const query = { ...route.query };
    delete query.forbidden;
    void router.replace({ path: route.path, query });
  }
});
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="items" />
    </template>
    <DashboardContent>
      <div class="mx-auto flex w-full max-w-5xl flex-col gap-8 py-4">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">{{ $t("page.home.title") }}</h1>
          <p class="mt-1 text-sm text-muted">
            {{ $t("page.home.signedInAs") }}
            <span class="font-medium text-default" translate="no">{{ user?.userName }}</span>
          </p>
        </div>

        <p v-if="!hasAnyTool" class="text-sm text-muted">
          {{ $t("page.home.noTools") }}
        </p>

        <div v-if="canProposals || canModeration" class="grid gap-4 sm:grid-cols-2">
          <DashboardSection
            v-if="canProposals"
            :title="$t('page.home.queues.proposals')"
            :status="proposals.status.value"
            :error-label="getApiErrorMessage(proposals.error.value) ?? $t('page.home.loadError')"
            @retry="proposals.refresh()"
          >
            <NuxtLink
              :to="localePath('/proposals')"
              class="flex items-center justify-between gap-3 rounded-lg border border-default p-4 hover:bg-elevated"
            >
              <span class="min-w-0 text-sm">
                {{
                  proposalCount === 0
                    ? $t("page.home.queues.proposalsEmpty")
                    : $t("page.home.queues.proposalsCount", { count: proposalCount }, proposalCount)
                }}
              </span>
              <span class="text-2xl font-bold tabular-nums">{{ proposalCount }}</span>
            </NuxtLink>
          </DashboardSection>

          <DashboardSection
            v-if="canModeration"
            :title="$t('page.home.queues.replies')"
            :status="replies.status.value"
            :error-label="getApiErrorMessage(replies.error.value) ?? $t('page.home.loadError')"
            @retry="replies.refresh()"
          >
            <NuxtLink
              :to="localePath('/moderation')"
              class="flex items-center justify-between gap-3 rounded-lg border border-default p-4 hover:bg-elevated"
            >
              <span class="min-w-0 text-sm">
                {{
                  replyCount === 0
                    ? $t("page.home.queues.repliesEmpty")
                    : $t("page.home.queues.repliesCount", { count: replyCount }, replyCount)
                }}
              </span>
              <span class="text-2xl font-bold tabular-nums">{{ replyCountLabel }}</span>
            </NuxtLink>
          </DashboardSection>
        </div>

        <div v-if="canNews || canMatches" class="grid gap-8 lg:grid-cols-2">
          <DashboardSection
            v-if="canNews"
            :title="$t('page.home.articles.title')"
            :status="articles.status.value"
            :empty="(articles.data.value ?? []).length === 0"
            :empty-label="$t('page.home.articles.empty')"
            :error-label="getApiErrorMessage(articles.error.value) ?? $t('page.home.loadError')"
            @retry="articles.refresh()"
          >
            <ul class="flex flex-col divide-y divide-default rounded-lg border border-default">
              <li v-for="article in articles.data.value" :key="article.id">
                <NuxtLink
                  :to="localePath(`/news/${article.slug}`)"
                  class="flex flex-col gap-1 p-3 hover:bg-elevated"
                >
                  <span class="flex min-w-0 items-center gap-2">
                    <span class="min-w-0 truncate text-sm font-medium">{{ article.title }}</span>
                    <UBadge
                      v-if="article.isDraft"
                      color="warning"
                      variant="subtle"
                      size="sm"
                      :label="$t('page.home.articles.draft')"
                    />
                  </span>
                  <span class="text-xs text-muted">
                    <span translate="no">{{ article.author }}</span>
                    · {{ formatDate(article.createdAt) }}
                  </span>
                </NuxtLink>
              </li>
            </ul>
          </DashboardSection>

          <DashboardSection
            v-if="canMatches"
            :title="$t('page.home.matches.title')"
            :status="matches.status.value"
            :empty="(matches.data.value ?? []).length === 0"
            :empty-label="$t('page.home.matches.empty')"
            :error-label="getApiErrorMessage(matches.error.value) ?? $t('page.home.loadError')"
            @retry="matches.refresh()"
          >
            <ul class="flex flex-col divide-y divide-default rounded-lg border border-default">
              <li v-for="match in matches.data.value" :key="match.id">
                <NuxtLink
                  :to="localePath(`/tournaments/${match.tournament.id}`)"
                  class="flex flex-col gap-1 p-3 hover:bg-elevated"
                >
                  <span class="truncate text-sm font-medium" translate="no">
                    {{ matchTitle(match.participants) }}
                  </span>
                  <span class="text-xs text-muted">
                    <span translate="no">{{ match.tournament.name }}</span>
                    · {{ formatDate(match.beginAt) }}
                  </span>
                </NuxtLink>
              </li>
            </ul>
          </DashboardSection>
        </div>

        <section v-if="hasAnyTool" class="flex flex-col gap-3">
          <h2 class="text-sm font-semibold">{{ $t("page.home.shortcuts") }}</h2>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="link in shortcuts"
              :key="link.to"
              :to="link.to"
              :icon="link.icon"
              :label="link.label"
              color="neutral"
              variant="outline"
            />
          </div>
        </section>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
