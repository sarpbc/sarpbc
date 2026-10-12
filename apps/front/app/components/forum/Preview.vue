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
      <SCard flush-bottom flush-top>
        <!-- Preserve the divider pixel as padding when the footer owns the seam. -->
        <SListItem
          v-for="(activity, index) in activities"
          :key="activity.id"
          size="compact"
          :divider="!user || index < activities.length - 1"
          :divider-top="index === 0"
          :to="$localePath(`/forum/post/${activity.id}`)"
          :title="activity.title"
          class="text-xs font-normal text-muted"
          :class="{ 'pb-px': user && index === activities.length - 1 }"
        >
          <div class="min-w-0 flex-1 truncate">{{ activity.title }}</div>
          <div class="shrink-0 tabular-nums text-muted">{{ activity.messageCount }}</div>
        </SListItem>
      </SCard>
      <ClientOnly>
        <UButton
          v-if="user"
          :to="localePath('/forum/new')"
          color="neutral"
          variant="solid"
          size="xs"
          :label="$t('components.forum.createPost')"
          :title="$t('components.forum.createPost')"
          class="h-row-compact min-h-row-compact w-full justify-center rounded-none border border-default font-normal"
        />
      </ClientOnly>
    </SRail>
    <LazyGameSidebarPromo class="hidden w-full md:block mt-4" hydrate-on-idle />
  </div>
</template>
