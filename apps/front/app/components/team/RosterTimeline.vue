<script lang="ts" setup>
import { DateFormatter } from "@internationalized/date";
import type { TeamRosterEra } from "~/composables/team/useTeamRosterHistory";

const VISIBLE_ERAS = 6;

const {
  eras,
  pending = false,
  hasError = false,
} = defineProps<{
  eras: TeamRosterEra[];
  pending?: boolean;
  hasError?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t, locale } = useI18n();

const headingId = "team-roster-history-title";
const showAll = ref(false);

const dateDf = computed(
  () =>
    new DateFormatter(locale.value, {
      dateStyle: "medium",
    }),
);

const visibleEras = computed(() => (showAll.value ? eras : eras.slice(0, VISIBLE_ERAS)));

const hasHiddenEras = computed(() => eras.length > VISIBLE_ERAS);

const formatDate = (value: string | null) => {
  if (!value) return null;
  return dateDf.value.format(new Date(value));
};

const formatEraRange = (era: TeamRosterEra) => {
  const start = formatDate(era.start);
  if (era.isCurrent) {
    return `${start} – ${t("page.team.slug.rosterHistory.present")}`;
  }
  const end = formatDate(era.end);
  return end ? `${start} – ${end}` : start;
};

const roleLabel = (role: TeamRosterEra["members"][number]["role"]) =>
  t(`common.contractRole.${role}`);

const memberNames = (members: TeamRosterEra["members"]) =>
  members.map((member) => member.name).join(", ");
</script>

<template>
  <section class="w-full flex flex-col gap-3" :aria-labelledby="headingId">
    <h2 :id="headingId" class="text-lg font-semibold tracking-tight pl-1">
      {{ t("page.team.slug.rosterHistory.title") }}
    </h2>

    <div v-if="pending" class="flex flex-col gap-4" aria-live="polite">
      <div v-for="index in 3" :key="index" class="flex gap-4 pl-1">
        <USkeleton class="w-0.5 shrink-0 self-stretch" />
        <div class="flex flex-1 flex-col gap-2 pb-4">
          <USkeleton class="h-4 w-40" />
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-10 w-full" />
        </div>
      </div>
    </div>

    <UiCard v-else-if="hasError">
      <div class="flex flex-col items-center gap-3 py-8 px-4 text-center">
        <UIcon name="i-fluent-warning-24-regular" class="text-3xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t("page.team.slug.rosterHistory.error") }}
        </p>
        <UButton variant="outline" color="error" @click="emit('retry')">
          {{ t("page.team.slug.rosterHistory.retry") }}
        </UButton>
      </div>
    </UiCard>

    <UiCard v-else-if="eras.length === 0">
      <div class="flex flex-col items-center gap-2 py-8 px-4 text-center">
        <UIcon name="i-fluent-people-team-24-regular" class="text-3xl text-muted" />
        <p class="text-sm text-muted text-pretty">
          {{ t("page.team.slug.rosterHistory.empty") }}
        </p>
        <p class="text-xs text-dimmed text-pretty">
          {{ t("page.team.slug.rosterHistory.emptyHint") }}
        </p>
      </div>
    </UiCard>

    <div v-else class="flex flex-col gap-2">
      <ol class="flex flex-col gap-0 list-none m-0 p-0">
        <li v-for="era in visibleEras" :key="era.id" class="flex gap-4 pl-1">
          <div
            class="w-0.5 shrink-0 self-stretch"
            :class="era.isCurrent ? 'bg-primary' : 'bg-default'"
            aria-hidden="true"
          />

          <div class="flex flex-1 flex-col gap-3 pb-6 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <time
                :datetime="era.start"
                class="text-sm font-medium"
                :class="era.isCurrent ? 'text-primary' : 'text-highlighted'"
              >
                {{ formatEraRange(era) }}
              </time>
              <UBadge v-if="era.isCurrent" color="primary" variant="subtle" size="sm">
                {{ t("page.team.slug.rosterHistory.current") }}
              </UBadge>
            </div>

            <ul class="flex flex-col gap-2 list-none m-0 p-0">
              <li
                v-for="member in era.members"
                :key="member.contractId"
                class="flex items-center gap-3"
              >
                <ULink :to="$localePath(`/player/${member.slug}`)" class="shrink-0">
                  <PlayerImg
                    :player-name="member.name"
                    :img="member.imageUrl || undefined"
                    size="sm"
                  />
                </ULink>
                <div class="flex-1 min-w-0">
                  <ULink
                    :to="$localePath(`/player/${member.slug}`)"
                    class="font-medium hover:underline truncate block"
                  >
                    {{ member.name }}
                  </ULink>
                  <p v-if="member.role !== 'active'" class="text-sm text-muted">
                    {{ roleLabel(member.role) }}
                  </p>
                </div>
              </li>
            </ul>

            <div
              v-if="era.joined.length > 0 || era.left.length > 0"
              class="flex flex-col gap-1 text-sm text-muted"
            >
              <p v-if="era.joined.length > 0" class="flex items-start gap-1.5">
                <UIcon name="i-fluent-arrow-down-24-regular" class="shrink-0 mt-0.5 text-success" />
                <span>
                  <span class="font-medium text-highlighted">
                    {{ t("page.team.slug.rosterHistory.joinedLabel") }}:
                  </span>
                  {{ memberNames(era.joined) }}
                </span>
              </p>
              <p v-if="era.left.length > 0" class="flex items-start gap-1.5">
                <UIcon name="i-fluent-arrow-up-24-regular" class="shrink-0 mt-0.5 text-error" />
                <span>
                  <span class="font-medium text-highlighted">
                    {{ t("page.team.slug.rosterHistory.leftLabel") }}:
                  </span>
                  {{ memberNames(era.left) }}
                </span>
              </p>
            </div>
          </div>
        </li>
      </ol>

      <UButton
        v-if="hasHiddenEras"
        variant="ghost"
        color="neutral"
        class="self-start"
        @click="showAll = !showAll"
      >
        {{
          showAll
            ? t("page.team.slug.rosterHistory.showLess")
            : t("page.team.slug.rosterHistory.showAll", { count: eras.length })
        }}
      </UButton>
    </div>
  </section>
</template>
