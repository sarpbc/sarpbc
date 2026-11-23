<script lang="ts" setup>
import type { RecordRow } from "~/utils/records";

const { title, rows } = defineProps<{ title: string; rows: RecordRow[] }>();

const { t } = useI18n();

const headingId = useId();
</script>

<template>
  <section :aria-labelledby="headingId">
    <HubRail>
      <template #caption>
        <h2 :id="headingId">{{ title }}</h2>
      </template>

      <HubCard>
        <ol v-if="rows.length > 0">
          <li v-for="row in rows" :key="row.key">
            <HubListItem :to="row.metaTo ? null : row.to" class="gap-3">
              <span class="w-5 shrink-0 text-right text-xs text-muted tabular-nums">
                {{ row.rank }}
              </span>
              <TeamImg v-if="row.team" :team-name="row.team.name" :logo="row.team" size="xs" />
              <SLink
                v-if="row.metaTo"
                :to="row.to"
                class="min-w-0 flex-1 truncate text-row"
                translate="no"
              >
                {{ row.label }}
              </SLink>
              <span
                v-else
                class="min-w-0 flex-1 truncate text-row text-default group-hover:text-highlighted"
                translate="no"
              >
                {{ row.label }}
              </span>
              <SLink
                v-if="row.meta && row.metaTo"
                :to="row.metaTo"
                class="hidden truncate text-xs sm:inline"
                translate="no"
              >
                {{ row.meta }}
              </SLink>
              <span v-else-if="row.meta" class="hidden truncate text-xs text-muted sm:inline">
                {{ row.meta }}
              </span>
              <span class="shrink-0 text-sm text-default tabular-nums">{{ row.value }}</span>
            </HubListItem>
          </li>
        </ol>

        <HubListItem v-else class="text-sm text-muted">{{ t("page.records.empty") }}</HubListItem>
      </HubCard>
    </HubRail>
  </section>
</template>
