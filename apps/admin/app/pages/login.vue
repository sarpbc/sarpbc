<script lang="ts" setup>
import { getApiErrorMessage, isStaffUser } from "@sarpbc/utils";

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

const onSubmit = async (event: Event) => {
  event.preventDefault();

  if (pending.value) {
    return;
  }

  pending.value = true;

  try {
    const res = await $fetch<{ success?: boolean }>(`${config.public.apiBase}/auth/login`, {
      body: {
        email: state.email.trim(),
        password: state.password,
      },
      credentials: "include",
      method: "POST",
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
        color: "danger",
        title: t("page.authentication.errors.notAdmin"),
      });

      return;
    }

    toast.add({
      color: "danger",
      title: t("page.authentication.errors.loginFailed"),
    });
  } catch (error) {
    toast.add({
      color: "danger",
      title: getApiErrorMessage(error) ?? t("page.authentication.errors.loginFailed"),
    });
  } finally {
    pending.value = false;
  }
};

const googleLogin = () => {
  window.location.href = `${config.public.apiBase}/auth/google?returnTo=admin`;
};
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

        <SbButton
          icon="i-logos-google-icon"
          :label="$t('page.authentication.continueWithGoogle')"
          variant="secondary"
          block
          @click="googleLogin"
        />

        <SbSeparator :label="$t('page.authentication.or')" class="my-6" />

        <form class="h-fit w-80" method="post" @submit="onSubmit">
          <SbFormField :label="$t('page.authentication.email')" class="w-full pb-4">
            <SbInput
              v-model="state.email"
              type="email"
              autocomplete="email"
              spellcheck="false"
              class="w-full"
            />
          </SbFormField>

          <SbFormField :label="$t('page.authentication.password')" class="w-full pb-8">
            <SbInput
              v-model="state.password"
              type="password"
              autocomplete="current-password"
              class="w-full"
            />
          </SbFormField>

          <SbButton
            :label="pending ? $t('page.authentication.loggingIn') : $t('page.authentication.logIn')"
            type="submit"
            :loading="pending"
            :disabled="pending"
            block
          />
        </form>
      </div>
    </SCrossCard>
  </div>
</template>
