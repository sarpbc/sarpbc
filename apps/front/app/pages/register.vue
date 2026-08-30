<script lang="ts" setup>
const config = useRuntimeConfig();
const posthog = usePostHog();
const { identifyUser } = usePostHogIdentity();

interface RegisterState {
  userName: string;
  email: string;
  password: string;
}

const state = reactive<RegisterState>({
  userName: "",
  email: "",
  password: "",
});

async function onSubmit(event: Event) {
  event.preventDefault();

  const res: { success?: boolean } = await $fetch<{
    success?: boolean;
  }>(`${config.public.apiBase}/auth/signup`, {
    method: "POST",
    body: {
      userName: state.userName,
      email: state.email,
      password: state.password,
    },
    credentials: "include",
  });

  if (res.success === true) {
    const user = useUser();
    const profile = await getProfile();
    user.value = profile;

    if (profile) {
      identifyUser(profile);
      posthog?.capture("user_signed_up");
    }

    navigateTo("/");
    return;
  }
}

onMounted(async () => {
  const user = useUser();

  if (user.value === undefined) {
    const profile = await getProfile();
    user.value = profile;
  }

  if (!user.value) {
    return;
  }

  navigateTo("/");
});

function googleLogin() {
  window.location.href = `${config.public.apiBase}/auth/google`;
}
</script>

<template>
  <div class="w-full h-full flex flex-col items-center justify-center">
    <SCrossCard class="p-4">
      <div class="w-full flex flex-col items-center justify-center">
        <h1 class="w-fit text-2xl font-bold">
          {{ $t("page.authentication.register") }}
        </h1>
        <div class="w-fit flex flex-row text-s font-light text-muted mt-2 mb-12">
          {{ $t("page.authentication.alreadyHaveAnAccount") }}&nbsp;
          <ULink
            class="text-s font-light text-primary hover:text-primary"
            :to="$localePath('/login')"
          >
            {{ $t("page.authentication.login") }}
          </ULink>
          .
        </div>

        <UButton
          icon="i-logos-google-icon"
          :label="$t('page.authentication.continueWithGoogle')"
          color="neutral"
          class="w-full flex flex-row justify-center text-highlighted"
          size="lg"
          variant="outline"
          @click="googleLogin"
        />

        <USeparator :label="$t('page.authentication.or')" class="my-6" />

        <UForm :state="state" class="w-80 h-fit" method="post" @submit="onSubmit">
          <UFormField
            :label="$t('page.authentication.userName')"
            name="userName"
            class="w-full pb-4"
          >
            <UInput v-model="state.userName" type="text" class="w-full" />
          </UFormField>

          <UFormField :label="$t('page.authentication.email')" name="email" class="w-full pb-4">
            <UInput v-model="state.email" type="email" class="w-full" />
          </UFormField>

          <UFormField
            :label="$t('page.authentication.password')"
            name="password"
            class="w-full pb-8"
          >
            <UInput v-model="state.password" type="password" class="w-full" />
          </UFormField>

          <UButton
            :label="$t('page.authentication.toRegister')"
            type="submit"
            color="neutral"
            class="w-full flex flex-col items-center"
          />
        </UForm>
      </div>
    </SCrossCard>
  </div>
</template>
