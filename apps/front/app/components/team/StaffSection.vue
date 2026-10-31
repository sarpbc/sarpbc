<script lang="ts" setup>
import type { Player } from "~/types/player";

const { staff } = defineProps<{
  staff: Player[];
}>();

const { t } = useI18n();

const headingId = "team-staff-title";
</script>

<template>
  <section :aria-labelledby="headingId">
    <SRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t("page.team.slug.staff") }}
        </h2>
      </template>
      <ul
        class="m-0 flex list-none flex-col divide-y divide-default border-x border-b border-default p-0"
      >
        <li v-for="member in staff" :key="member.id" class="flex flex-row items-center gap-3 p-3">
          <SLink :to="$localePath(`/player/${member.slug}`)" class="shrink-0">
            <PlayerImg :player-name="member.name" :img="member.imageUrl" size="sm" />
          </SLink>
          <div class="flex min-w-0 flex-1 flex-col">
            <div class="flex min-w-0 flex-row items-center gap-1">
              <FlagIcon :nationality="member.nationality" class="shrink-0" />
              <SLink :to="$localePath(`/player/${member.slug}`)" variant="inline" class="truncate">
                {{ member.name }}
              </SLink>
            </div>
            <span v-if="member.role" class="text-sm text-muted">
              {{ t(`common.contractRole.${member.role}`) }}
            </span>
          </div>
        </li>
      </ul>
    </SRail>
  </section>
</template>
