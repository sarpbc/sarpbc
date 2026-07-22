<script lang="ts" setup>
import { getApiErrorMessage } from "~/utils/apiError";

const config = useRuntimeConfig();
const toast = useToast();
const { t } = useI18n();

interface LoginState {
  email: string;
  password: string;
}

const state = reactive<LoginState>({
  email: "",
  password: "",
});

const pending = ref(false);

onMounted(async () => {
  const user = useUser();

  if (user.value === undefined) {
    const profile = await getProfile();
    user.value = profile;
  }

  if (user.value?.admin === true) {
    await navigateTo("/");
  }
});

async function onSubmit(event: Event) {
  event.preventDefault();
  if (pending.value) {
    return;
  }

  pending.value = true;

  try {
    const res = await $fetch<{ success?: boolean }>(`${config.public.apiBase}/auth/login`, {
      method: "POST",
      body: {
        email: state.email.trim(),
        password: state.password,
      },
      credentials: "include",
    });

    if (res.success === true) {
      const user = useUser();
      const profile = await getProfile();
      user.value = profile;

      if (profile?.admin === true) {
        await navigateTo("/");
        return;
      }

      user.value = null;
      toast.add({
        title: t("page.authentication.errors.notAdmin"),
        color: "error",
      });
      return;
    }

    toast.add({
      title: t("page.authentication.errors.loginFailed"),
      color: "error",
    });
  } catch (error) {
    toast.add({
      title: getApiErrorMessage(error) ?? t("page.authentication.errors.loginFailed"),
      color: "error",
    });
  } finally {
    pending.value = false;
  }
}

function googleLogin() {
  window.location.href = `${config.public.apiBase}/auth/google?returnTo=admin`;
}
</script>

<template>
  <div class="w-full min-h-svh flex flex-col items-center justify-center px-4">
    <div class="w-full max-w-sm border border-default bg-elevated p-6">
      <div class="w-full flex flex-col items-center justify-center">
        <p class="text-sm font-medium text-muted mb-1">{{ $t("page.home.brand") }}</p>
        <h1 class="w-fit text-2xl font-bold tracking-tight">
          {{ $t("page.authentication.login") }}
        </h1>
        <p class="text-sm text-muted mt-2 mb-6 text-center">
          {{ $t("page.authentication.staffOnly") }}
        </p>

        <UButton
          icon="i-logos-google-icon"
          :label="$t('page.authentication.continueWithGoogle')"
          color="neutral"
          class="w-full flex flex-row justify-center cursor-pointer text-highlighted"
          size="lg"
          variant="outline"
          @click="googleLogin"
        />

        <USeparator :label="$t('page.authentication.or')" class="my-6" />

        <UForm :state="state" class="w-full h-fit" method="post" @submit="onSubmit">
          <UFormField :label="$t('page.authentication.email')" name="email" class="w-full pb-4">
            <UInput
              v-model="state.email"
              type="email"
              autocomplete="email"
              spellcheck="false"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('page.authentication.password')"
            name="password"
            class="w-full pb-8"
          >
            <UInput
              v-model="state.password"
              type="password"
              autocomplete="current-password"
              class="w-full"
            />
          </UFormField>

          <UButton
            :label="pending ? $t('page.authentication.loggingIn') : $t('page.authentication.logIn')"
            color="neutral"
            type="submit"
            :loading="pending"
            :disabled="pending"
            class="w-full flex flex-col items-center cursor-pointer"
          />
        </UForm>
      </div>
    </div>
  </div>
</template>
