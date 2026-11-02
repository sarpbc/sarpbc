<script lang="ts" setup>
import { getApiErrorMessage } from "~/utils/apiError";

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();

const eventId = computed(() => route.params.id as string);
const formState = ref(eventToFormState(null));
const isSaving = ref(false);

const {
  data: event,
  status,
  error,
  refresh,
} = await useLazyAsyncData(
  () => `admin-manual-event-${eventId.value}`,
  () => getManualEvent(eventId.value),
  { server: false, watch: [eventId] },
);

const { data: leagues } = await useLazyAsyncData(
  "admin-tournament-leagues",
  () => getTournamentLeagues(),
  { server: false, default: () => [] },
);

watch(
  event,
  (value) => {
    if (value) formState.value = eventToFormState(value);
  },
  { immediate: true },
);

const breadcrumbItems = computed(() => [
  { label: t("page.tournaments.title"), to: localePath("/tournaments") },
  { label: t("page.tournaments.events.title"), to: localePath("/tournaments/events") },
  { label: event.value?.name ?? eventId.value },
]);

function formatDate(date: Date | string | null): string {
  return date ? new Date(date).toLocaleDateString() : "-";
}

async function handleSubmit() {
  if (!event.value || isSaving.value) return;
  if (!formState.value.name.trim()) {
    toast.add({ title: t("page.tournaments.events.form.nameRequired"), color: "error" });
    return;
  }
  const payload = buildEventPayload(formState.value, event.value);
  if (Object.keys(payload).length === 0) {
    toast.add({ title: t("page.tournaments.events.edit.unchanged") });
    return;
  }
  isSaving.value = true;
  try {
    event.value = await updateEvent(event.value.id, payload);
    toast.add({ title: t("page.tournaments.events.edit.saved"), color: "success" });
  } catch (error) {
    console.error("Failed to update event:", error);
    toast.add({
      title: getApiErrorMessage(error) ?? t("page.tournaments.events.saveFailed"),
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <UButton
        v-if="event?.editable"
        icon="i-fluent-save-24-regular"
        :label="$t('page.tournaments.events.save')"
        :loading="isSaving"
        @click="handleSubmit"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-6">
        <p v-if="status === 'pending' || status === 'idle'" class="text-sm text-muted">
          {{ $t("page.tournaments.loading") }}
        </p>

        <TournamentLoadError
          v-else-if="status === 'error' || !event"
          :message="getApiErrorMessage(error) ?? $t('page.tournaments.events.loadOneError')"
          @retry="refresh()"
        />

        <template v-else>
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">
              {{ $t("page.tournaments.events.edit.title") }}
            </h1>
            <p class="mt-1 text-sm text-muted">
              {{
                event.editable
                  ? $t("page.tournaments.events.edit.subtitle")
                  : $t("page.tournaments.events.edit.synced")
              }}
            </p>
          </div>

          <form @submit.prevent="handleSubmit">
            <TournamentEventForm
              v-model="formState"
              :leagues="leagues"
              :disabled="isSaving || !event.editable"
            />
          </form>

          <section class="flex max-w-2xl flex-col gap-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-sm font-semibold">
                {{ $t("page.tournaments.events.stages.title") }}
              </h2>
              <UButton
                variant="soft"
                size="sm"
                icon="i-fluent-add-24-regular"
                :label="$t('page.tournaments.create.action')"
                :to="localePath('/tournaments/create')"
              />
            </div>
            <p class="text-sm text-muted">{{ $t("page.tournaments.events.stages.hint") }}</p>
            <p
              v-if="event.stages.length === 0"
              class="rounded-lg border border-default p-4 text-sm text-muted"
            >
              {{ $t("page.tournaments.events.stages.empty") }}
            </p>
            <ul v-else class="divide-y divide-default rounded-lg border border-default">
              <li
                v-for="stage in event.stages"
                :key="stage.id"
                class="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div class="flex min-w-0 flex-col">
                  <span class="font-medium">{{ stage.name }}</span>
                  <span v-if="stage.beginAt || stage.endAt" class="text-xs text-muted">
                    {{ formatDate(stage.beginAt) }} – {{ formatDate(stage.endAt) }}
                  </span>
                </div>
                <UButton
                  variant="ghost"
                  size="xs"
                  icon="i-fluent-edit-24-regular"
                  :label="$t('page.tournaments.edit.action')"
                  :to="localePath(`/tournaments/${stage.id}/edit`)"
                />
              </li>
            </ul>
          </section>
        </template>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
