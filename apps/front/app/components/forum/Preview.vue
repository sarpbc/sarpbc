<script lang="ts" setup>
const route = useRoute();

const { data: recentForumActivities } = await useLazyAsyncData(
  `forum-posts-preview`,
  () => getRecentForumActivities(),
  { watch: [() => route.path] },
);
</script>

<template>
  <div class="w-full flex flex-col">
    <div class="flex flex-col-reverse text-sm font-medium text-toned md:h-18 pl-2 pb-1">
      {{ $t("components.forum.recentPosts") }}
    </div>
    <div class="w-full flex flex-col border border-default py-0 gap-0 overflow-hidden">
      <UButton
        v-for="activity in recentForumActivities"
        :key="activity.id"
        :to="$localePath(`/forum/post/${activity.id}`)"
        color="neutral"
        variant="link"
        :ui="{ base: 'rounded-none' }"
        :title="activity.title"
        class="w-full grid grid-cols-6 items-center text-xs font-normal px-2 py-[2.75px]! leading-5.5"
      >
        <div class="col-span-5 truncate">{{ activity.title }}</div>
        <div class="col-span-1 flex flex-row justify-end">
          {{ activity.messageCount }}
        </div>
      </UButton>
    </div>
    <div class="w-full border border-t-0 border-default p-1 h-11 max-h-8.25">
      <UButton
        :to="$localePath(`/forum/new`)"
        icon="i-fluent-add-24-regular"
        color="primary"
        variant="soft"
        :label="$t('components.forum.createPost')"
        :title="$t('components.forum.createPost')"
        class="w-full h-full p-1! font-normal!"
      />
    </div>
  </div>
</template>
