<script lang="ts" setup>
import { forumPostPath } from "@sarpbc/utils";

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
      <SCard>
        <SListItem
          v-for="activity in activities"
          :key="activity.id"
          size="compact"
          :to="$localePath(forumPostPath(activity.publicId, activity.slug))"
          :title="activity.title"
          class="text-xs font-normal text-default hover:text-highlighted"
        >
          <div class="min-w-0 flex-1 truncate">{{ activity.title }}</div>
          <div class="shrink-0 tabular-nums text-muted">{{ activity.messageCount }}</div>
        </SListItem>
        <ClientOnly>
          <SListItem
            v-if="user"
            size="compact"
            :to="localePath('/forum/new')"
            :title="$t('components.forum.createPost')"
            class="border-t border-default text-xs font-normal text-muted hover:text-highlighted"
          >
            {{ $t("components.forum.createPost") }}
          </SListItem>
        </ClientOnly>
      </SCard>
    </SRail>
    <LazyGameSidebarPromo class="hidden w-full md:block" hydrate-on-idle />
  </div>
</template>
