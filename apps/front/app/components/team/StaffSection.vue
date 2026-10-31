<script lang="ts" setup>
import type { Player } from "~/types/player";

const { staff } = defineProps<{
  staff: Player[];
}>();

const { t } = useI18n();

const headingId = useId();
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
        <li v-for="member in staff" :key="member.id" class="p-3">
          <TeamMember
            :name="member.name"
            :slug="member.slug"
            :image-url="member.imageUrl"
            :nationality="member.nationality"
            :role="member.role ? t(`common.contractRole.${member.role}`) : undefined"
          />
        </li>
      </ul>
    </SRail>
  </section>
</template>
