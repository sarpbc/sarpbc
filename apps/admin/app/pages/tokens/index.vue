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

const isCreateModalOpen = ref(false);
const isRevealModalOpen = ref(false);
const isRevokeModalOpen = ref(false);
const tokenToRevoke = ref<PatToken | null>(null);
const isCreating = ref(false);
const isRevoking = ref(false);
const newTokenName = ref("");
const revealedToken = ref<string | null>(null);
const copied = ref<"token" | "config" | null>(null);

const {
  status,
  data: tokens,
  refresh,
  error,
} = await useLazyAsyncData("admin-pat-tokens", () => getPatTokens(), {
  default: () => [] as PatToken[],
  server: false,
});

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
    copied.value = target;
    setTimeout(() => {
      copied.value = null;
    }, 2000);
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
    copied.value = null;
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
        <form @submit.prevent="confirmCreate">
          <UFormField :label="$t('page.tokens.create.nameLabel')" name="name" required>
            <UInput
              v-model="newTokenName"
              :placeholder="$t('page.tokens.create.namePlaceholder')"
              :maxlength="100"
              class="w-full"
              autofocus
            />
          </UFormField>
        </form>
      </template>
      <template #footer>
        <UButton
          icon="i-fluent-key-24-regular"
          :label="$t('page.tokens.create.submit')"
          :loading="isCreating"
          :disabled="!newTokenName.trim()"
          @click="confirmCreate"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isCreating"
          @click="isCreateModalOpen = false"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="isRevealModalOpen"
      :title="$t('page.tokens.reveal.title')"
      :dismissible="false"
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
                :icon="copied === 'token' ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                :label="
                  copied === 'token'
                    ? $t('page.tokens.reveal.copied')
                    : $t('page.tokens.reveal.copy')
                "
                variant="soft"
                class="shrink-0"
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
                :icon="copied === 'config' ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                :label="
                  copied === 'config'
                    ? $t('page.tokens.reveal.copied')
                    : $t('page.tokens.reveal.copyConfig')
                "
                variant="soft"
                size="sm"
                class="self-start"
                @click="copyText(mcpConfigSnippet, 'config')"
              />
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <UButton :label="$t('page.tokens.reveal.dismiss')" @click="closeRevealModal" />
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
          @click="confirmRevoke"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isRevoking"
          @click="isRevokeModalOpen = false"
        />
      </template>
    </UModal>
  </NuxtLayout>
</template>
