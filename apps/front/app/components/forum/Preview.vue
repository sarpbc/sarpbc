<script lang="ts" setup>
const localePath = useLocalePath();
const user = useUser();

const { data: recentForumActivities } = await useLazyAsyncData(
  `forum-posts-preview`,
  () => getRecentForumActivities(),
  {
    getCachedData(key, nuxtApp) {
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  },
);

const activities = computed(() => recentForumActivities.value ?? []);
</script>

<template>
  <div class="w-full flex flex-col">
    <UiRail :title="$t('components.forum.recentPosts')">
      <!-- Bordered stack matches match-rail UiCard (hub DA — not a one-off). -->
      <div class="w-full flex flex-col border border-default overflow-hidden">
        <UiListItem
          v-for="(activity, index) in activities"
          :key="activity.id"
          size="compact"
          :divider="index < activities.length - 1"
          :to="$localePath(`/forum/post/${activity.id}`)"
          :title="activity.title"
          class="text-xs font-normal text-muted"
        >
          <div class="min-w-0 flex-1 truncate">{{ activity.title }}</div>
          <div class="shrink-0 tabular-nums text-muted">{{ activity.messageCount }}</div>
        </UiListItem>
        <!-- ClientOnly: island is hydrate-on-idle; auth may revalidate after hydrate.
             border-t (not last-item divider) avoids a double bottom edge before hydrate. -->
        <ClientOnly>
          <UButton
            v-if="user"
            :to="localePath('/forum/new')"
            icon="i-fluent-add-24-regular"
            color="primary"
            variant="soft"
            size="xs"
            :label="$t('components.forum.createPost')"
            :title="$t('components.forum.createPost')"
            class="h-row-compact min-h-row-compact w-full rounded-none border-t border-default font-normal"
          />
        </ClientOnly>
      </div>
    </UiRail>
    <LazyGameSidebarPromo class="hidden w-full md:block mt-4" hydrate-on-idle />
  </div>
</template>
