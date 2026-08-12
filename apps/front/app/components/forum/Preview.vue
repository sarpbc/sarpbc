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
    <SRail caption="lead" :title="$t('components.forum.recentPosts')">
      <SCard flush-bottom>
        <SListItem
          v-for="activity in activities"
          :key="activity.id"
          size="compact"
          divider
          :to="$localePath(`/forum/post/${activity.id}`)"
          :title="activity.title"
          class="text-xs font-normal text-muted"
        >
          <div class="min-w-0 flex-1 truncate">{{ activity.title }}</div>
          <div class="shrink-0 tabular-nums text-muted">{{ activity.messageCount }}</div>
        </SListItem>
        <!-- ClientOnly: island is hydrate-on-idle; auth may revalidate after hydrate.
             Last activity keeps its divider as the seam above this row when present. -->
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
            class="h-row-compact min-h-row-compact w-full rounded-none border-b border-default font-normal"
          />
        </ClientOnly>
      </SCard>
    </SRail>
    <LazyGameSidebarPromo class="hidden w-full md:block mt-4" hydrate-on-idle />
  </div>
</template>
