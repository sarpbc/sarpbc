<script lang="ts" setup>
import { getApiErrorMessage } from "~/utils/apiError";
import { isStaffUser } from "~/utils/staff";

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

  if (isStaffUser(user.value)) {
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

      if (isStaffUser(profile)) {
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
  <div class="flex h-full w-full flex-col items-center justify-center">
    <SCrossCard class="p-4">
      <div class="flex w-full flex-col items-center justify-center">
        <img
          src="/sarpbc.svg"
          :alt="$t('page.home.logoAlt')"
          width="48"
          height="48"
          decoding="async"
          class="size-12 bg-transparent"
        />
        <h1 class="mt-2 w-fit text-2xl font-bold">
          {{ $t("page.authentication.login") }}
        </h1>
        <p class="mt-2 mb-6 w-fit text-center text-sm font-light text-muted">
          {{ $t("page.authentication.staffOnly") }}
        </p>

        <UButton
          icon="i-logos-google-icon"
          :label="$t('page.authentication.continueWithGoogle')"
          color="neutral"
          class="flex w-full flex-row justify-center text-highlighted"
          size="lg"
          variant="outline"
          @click="googleLogin"
        />

        <USeparator :label="$t('page.authentication.or')" class="my-6" />

        <UForm :state="state" class="h-fit w-80" method="post" @submit="onSubmit">
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
            class="flex w-full flex-col items-center"
          />
        </UForm>
      </div>
    </SCrossCard>
  </div>
</template>
