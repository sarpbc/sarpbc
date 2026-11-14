<script lang="ts" setup>
import type { SeasonAward, SeasonAwardInput, SeasonInput } from "@sarpbc/types";
import { getApiErrorMessage, seasonArchivePath } from "@sarpbc/utils";

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();
const config = useRuntimeConfig();

const seasonId = computed(() => String(route.params.id));

const {
  data: season,
  status,
  error,
  refresh,
} = await useLazyAsyncData(
  () => `admin-season-${seasonId.value}`,
  () => getSeason(seasonId.value),
  { server: false, watch: [seasonId] },
);

const breadcrumbItems = computed(() => [
  { label: t("page.seasons.title"), to: localePath("/seasons") },
  { label: season.value?.name ?? seasonId.value },
]);

const publicUrl = computed(() =>
  season.value?.slug
    ? `${config.public.publicSiteUrl}${seasonArchivePath(season.value.slug)}`
    : null,
);

const isSaving = ref(false);
const isAdding = ref(false);
const awardToRemove = ref<SeasonAward | null>(null);
const awardForm = useTemplateRef("awardForm");

function awardLabel(award: SeasonAward): string {
  const type = t(`page.seasons.awards.types.${award.awardType}`);

  return award.region ? `${type} · ${award.region}` : type;
}

async function save(input: SeasonInput) {
  isSaving.value = true;

  try {
    season.value = await updateSeason(seasonId.value, input);
    toast.add({ title: t("page.seasons.edit.saved"), color: "success" });
  } catch (saveError) {
    reportError(saveError, t("page.seasons.edit.failed"));
  } finally {
    isSaving.value = false;
  }
}

async function addAward(input: SeasonAwardInput) {
  isAdding.value = true;

  try {
    const award = await createSeasonAward(seasonId.value, input);
    toast.add({
      title: t("page.seasons.awards.added", { name: award.player.name, type: awardLabel(award) }),
      color: "success",
    });
    awardForm.value?.reset();
    await refresh();
  } catch (addError) {
    reportError(addError, t("page.seasons.awards.addFailed"));
  } finally {
    isAdding.value = false;
  }
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <DashboardContent>
      <p v-if="status === 'pending' && !season" class="text-sm text-muted">
        {{ $t("page.seasons.loading") }}
      </p>

      <LoadError
        v-else-if="error || !season"
        :message="getApiErrorMessage(error) ?? $t('page.seasons.loadError')"
        @retry="refresh()"
      />

      <div v-else class="flex flex-col gap-6">
        <section class="flex max-w-xl flex-col gap-3">
          <h2 class="text-lg font-semibold">{{ $t("page.seasons.edit.title") }}</h2>
          <p class="text-sm text-muted">
            <template v-if="publicUrl">
              {{ $t("page.seasons.edit.publishedAt") }}
              <ULink :to="publicUrl" external target="_blank" class="text-primary hover:underline">
                {{ publicUrl }}
              </ULink>
            </template>
            <template v-else>{{ $t("page.seasons.edit.unpublished") }}</template>
          </p>
          <SeasonForm
            :key="season.id"
            :season="season"
            :submit-label="$t('page.seasons.edit.submit')"
            :loading="isSaving"
            @submit="save"
          />
        </section>

        <SeasonParticipants
          :season-id="season.id"
          :participants="season.participants"
          :winner-team-id="season.winnerTeamId"
          @changed="refresh()"
        />

        <section class="flex flex-col gap-3 border border-default p-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-lg font-semibold">{{ $t("page.seasons.awards.title") }}</h2>
            <p class="text-sm text-muted">{{ $t("page.seasons.awards.hint") }}</p>
          </div>

          <p v-if="season.awards.length === 0" class="text-sm text-muted">
            {{ $t("page.seasons.awards.empty") }}
          </p>

          <ul v-else class="flex flex-col gap-2">
            <li
              v-for="award in season.awards"
              :key="award.id"
              class="flex flex-row flex-wrap items-start justify-between gap-3 border border-default p-3"
            >
              <div class="flex min-w-0 flex-col gap-1 text-sm">
                <p class="font-medium">
                  {{ awardLabel(award) }}:
                  <ULink :to="localePath(`/players/${award.player.id}`)" translate="no">
                    {{ award.player.name }}
                  </ULink>
                </p>
                <p v-if="award.presentedBy" class="text-muted">
                  {{ $t("page.seasons.awards.presentedByValue", { name: award.presentedBy }) }}
                </p>
                <ULink
                  :to="award.sourceUrl"
                  external
                  target="_blank"
                  class="break-all text-primary hover:underline"
                >
                  {{ award.sourceUrl }}
                </ULink>
              </div>
              <UButton
                color="error"
                variant="ghost"
                size="sm"
                icon="i-fluent-delete-24-regular"
                :aria-label="$t('page.seasons.awards.remove.title')"
                @click="awardToRemove = award"
              />
            </li>
          </ul>
        </section>

        <section class="flex max-w-xl flex-col gap-3">
          <h2 class="text-lg font-semibold">{{ $t("page.seasons.awards.addTitle") }}</h2>
          <SeasonAwardForm ref="awardForm" :loading="isAdding" @submit="addAward" />
        </section>
      </div>
    </DashboardContent>

    <ConfirmDeleteModal
      v-model:target="awardToRemove"
      :title="$t('page.seasons.awards.remove.title')"
      :confirm-label="$t('page.seasons.awards.remove.confirmButton')"
      :message="
        (target) =>
          $t('page.seasons.awards.remove.confirm', {
            type: awardLabel(target),
            name: target.player.name,
          })
      "
      :remove="(target) => deleteSeasonAward(seasonId, target.id)"
      @deleted="refresh()"
    />
  </NuxtLayout>
</template>
