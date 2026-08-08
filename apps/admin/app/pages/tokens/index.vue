<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import type { PatToken } from "~/types/token";
import { getApiErrorMessage } from "~/utils/apiError";

const { t, locale } = useI18n();
const toast = useToast();
const config = useRuntimeConfig();

const MCP_URL = `${config.public.apiBase}/mcp`;

const breadcrumbItems = [
  {
    label: t("page.tokens.title"),
  },
];

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value === "fr" ? "fr-FR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
);

const columns: TableColumn<PatToken>[] = [
  {
    accessorKey: "name",
    header: t("page.tokens.columns.name"),
  },
  {
    accessorKey: "createdAt",
    header: t("page.tokens.columns.createdAt"),
    cell: ({ getValue }) => dateFormatter.value.format(new Date(getValue() as string)),
  },
  {
    accessorKey: "lastUsedAt",
    header: t("page.tokens.columns.lastUsedAt"),
    cell: ({ getValue }) => {
      const value = getValue() as string | null;
      return value ? dateFormatter.value.format(new Date(value)) : t("page.tokens.lastUsedNever");
    },
  },
  {
    id: "actions",
    header: "",
  },
];

const tokens = ref<PatToken[]>([]);
const isCreateModalOpen = ref(false);
const isRevealModalOpen = ref(false);
const isRevokeModalOpen = ref(false);
const tokenToRevoke = ref<PatToken | null>(null);
const isCreating = ref(false);
const isRevoking = ref(false);
const newTokenName = ref("");
const revealedToken = ref<string | null>(null);
const copiedToken = ref(false);
const copiedConfig = ref(false);

const { status, data, refresh, error } = await useLazyAsyncData(
  "admin-pat-tokens",
  () => getPatTokens(),
  {
    default: () => [] as PatToken[],
    server: false,
  },
);

watch(
  status,
  (s) => {
    if (s === "success" && data.value) {
      tokens.value = data.value;
    }
  },
  { immediate: true },
);

const mcpConfigSnippet = computed(() => {
  if (!revealedToken.value) {
    return "";
  }
  return `URL: ${MCP_URL}\nHeader: Authorization: Bearer ${revealedToken.value}`;
});

function openCreateModal() {
  newTokenName.value = "";
  isCreateModalOpen.value = true;
}

function openRevokeModal(token: PatToken) {
  tokenToRevoke.value = token;
  isRevokeModalOpen.value = true;
}

async function copyText(text: string, target: "token" | "config") {
  try {
    await navigator.clipboard.writeText(text);
    if (target === "token") {
      copiedToken.value = true;
      setTimeout(() => {
        copiedToken.value = false;
      }, 2000);
    } else {
      copiedConfig.value = true;
      setTimeout(() => {
        copiedConfig.value = false;
      }, 2000);
    }
  } catch {
    toast.add({
      title: t("page.tokens.copyFailed"),
      color: "error",
    });
  }
}

async function confirmCreate() {
  const name = newTokenName.value.trim();
  if (!name) {
    return;
  }

  isCreating.value = true;
  try {
    const created = await createPatToken(name);
    isCreateModalOpen.value = false;
    newTokenName.value = "";
    revealedToken.value = created.token;
    copiedToken.value = false;
    copiedConfig.value = false;
    isRevealModalOpen.value = true;
    await refresh();
  } catch (err) {
    toast.add({
      title: getApiErrorMessage(err) ?? t("page.tokens.create.failed"),
      color: "error",
    });
  } finally {
    isCreating.value = false;
  }
}

function closeRevealModal() {
  isRevealModalOpen.value = false;
  revealedToken.value = null;
}

async function confirmRevoke() {
  if (!tokenToRevoke.value) {
    return;
  }

  isRevoking.value = true;
  try {
    await revokePatToken(tokenToRevoke.value.id);
    isRevokeModalOpen.value = false;
    tokenToRevoke.value = null;
    toast.add({
      title: t("page.tokens.revoke.success"),
      color: "success",
    });
    await refresh();
  } catch (err) {
    toast.add({
      title: getApiErrorMessage(err) ?? t("page.tokens.revoke.failed"),
      color: "error",
    });
  } finally {
    isRevoking.value = false;
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
        icon="i-fluent-add-24-regular"
        :label="$t('page.tokens.create.button')"
        class="cursor-pointer"
        @click="openCreateModal"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p v-if="status === 'pending'" class="text-sm text-muted">
          {{ $t("page.tokens.loading") }}
        </p>

        <div
          v-else-if="status === 'error'"
          class="flex flex-col items-start gap-3 rounded-lg border border-default p-6"
        >
          <p class="text-sm text-muted">
            {{ getApiErrorMessage(error) ?? $t("page.tokens.loadError") }}
          </p>
          <UButton
            icon="i-fluent-arrow-clockwise-24-regular"
            :label="$t('page.tokens.retry')"
            variant="soft"
            class="cursor-pointer"
            @click="refresh()"
          />
        </div>

        <template v-else>
          <p v-if="tokens.length > 0" class="text-sm text-muted">
            {{ $t("page.tokens.tokensCount", { count: tokens.length }, tokens.length) }}
          </p>

          <div
            v-if="tokens.length === 0"
            class="flex flex-col items-start gap-4 rounded-lg border border-default p-6"
          >
            <div class="flex flex-col gap-2">
              <h2 class="text-lg font-semibold">
                {{ $t("page.tokens.empty.title") }}
              </h2>
              <p class="text-sm text-muted">
                {{ $t("page.tokens.empty.description") }}
              </p>
            </div>
            <UButton
              icon="i-fluent-add-24-regular"
              :label="$t('page.tokens.create.button')"
              class="cursor-pointer"
              @click="openCreateModal"
            />
          </div>

          <ClientOnly>
            <UTable
              v-if="tokens.length > 0"
              :data="tokens"
              :columns="columns"
              :ui="{
                base: 'table-fixed border-separate border-spacing-0',
                thead: '[&>tr]:bg-muted [&>tr]:after:content-none [&>tr:nth-child(2)]:h-0',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                th: 'first:rounded-l-lg last:rounded-r-lg border-y border-muted first:border-l last:border-r',
                td: 'border-b border-muted',
              }"
              sticky
            >
              <template #actions-cell="{ row }">
                <UButton
                  color="error"
                  variant="ghost"
                  size="xs"
                  icon="i-fluent-delete-24-regular"
                  :aria-label="$t('page.tokens.revoke.title')"
                  class="cursor-pointer"
                  @click="openRevokeModal(row.original)"
                />
              </template>
            </UTable>
          </ClientOnly>
        </template>
      </div>
    </DashboardContent>

    <UModal
      v-model:open="isCreateModalOpen"
      :title="$t('page.tokens.create.title')"
      :dismissible="!isCreating"
    >
      <template #body>
        <UFormField :label="$t('page.tokens.create.nameLabel')" name="name" required>
          <UInput
            v-model="newTokenName"
            :placeholder="$t('page.tokens.create.namePlaceholder')"
            :maxlength="100"
            class="w-full"
            autofocus
            @keyup.enter="confirmCreate"
          />
        </UFormField>
      </template>
      <template #footer>
        <UButton
          icon="i-fluent-key-24-regular"
          :label="$t('page.tokens.create.submit')"
          :loading="isCreating"
          :disabled="!newTokenName.trim()"
          class="cursor-pointer"
          @click="confirmCreate"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isCreating"
          class="cursor-pointer"
          @click="isCreateModalOpen = false"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="isRevealModalOpen"
      :title="$t('page.tokens.reveal.title')"
      :dismissible="false"
      @update:open="(open) => !open && closeRevealModal()"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <p class="text-sm text-warning">
            {{ $t("page.tokens.reveal.warning") }}
          </p>

          <UFormField :label="$t('page.tokens.reveal.tokenLabel')">
            <div class="flex flex-row gap-2">
              <code
                class="min-w-0 flex-1 overflow-x-auto rounded border border-default bg-muted px-3 py-2 font-mono text-sm"
              >
                {{ revealedToken }}
              </code>
              <UButton
                :icon="copiedToken ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                :label="
                  copiedToken ? $t('page.tokens.reveal.copied') : $t('page.tokens.reveal.copy')
                "
                variant="soft"
                class="shrink-0 cursor-pointer"
                @click="revealedToken && copyText(revealedToken, 'token')"
              />
            </div>
          </UFormField>

          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium">
              {{ $t("page.tokens.reveal.configHint") }}
            </p>
            <div class="flex flex-col gap-2">
              <pre
                class="overflow-x-auto rounded border border-default bg-muted p-3 font-mono text-sm whitespace-pre-wrap"
                >{{ mcpConfigSnippet }}</pre>
              <UButton
                :icon="copiedConfig ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                :label="
                  copiedConfig
                    ? $t('page.tokens.reveal.copied')
                    : $t('page.tokens.reveal.copyConfig')
                "
                variant="soft"
                size="sm"
                class="self-start cursor-pointer"
                @click="copyText(mcpConfigSnippet, 'config')"
              />
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <UButton
          :label="$t('page.tokens.reveal.dismiss')"
          class="cursor-pointer"
          @click="closeRevealModal"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="isRevokeModalOpen"
      :title="$t('page.tokens.revoke.title')"
      :dismissible="!isRevoking"
    >
      <template #body>
        <p>
          {{
            $t("page.tokens.revoke.confirm", {
              name: tokenToRevoke?.name ?? "",
            })
          }}
        </p>
      </template>
      <template #footer>
        <UButton
          icon="i-fluent-delete-24-regular"
          color="error"
          :label="$t('page.tokens.revoke.confirmButton')"
          :loading="isRevoking"
          class="cursor-pointer"
          @click="confirmRevoke"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isRevoking"
          class="cursor-pointer"
          @click="isRevokeModalOpen = false"
        />
      </template>
    </UModal>
  </NuxtLayout>
</template>
