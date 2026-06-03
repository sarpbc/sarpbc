<script lang="ts" setup>
const config = useRuntimeConfig();

interface LoginState {
  email: string;
  password: string;
}

const state = reactive<LoginState>({
  email: "",
  password: "",
});

onMounted(async () => {
  const user = useUser();

  if (user.value === null) {
    const profile = await getProfile();
    user.value = profile;
  }

  if (user.value === null) {
    return;
  }

  navigateTo("/");
});

async function onSubmit(event: Event) {
  event.preventDefault();

  try {
    const res: { success?: boolean } = await $fetch<{
      success?: boolean;
    }>(`${config.public.apiBase}/auth/login`, {
      method: "POST",
      body: {
        email: state.email,
        password: state.password,
      },
      credentials: "include",
    });

    if (res.success === true) {
      const user = useUser();
      const profile = await getProfile();
      user.value = profile;

      navigateTo("/");
      return;
    }

    console.error("Login failed: Invalid credentials");
  } catch (error) {
    console.error("Login failed:", error);
  }
}

function googleLogin() {
  window.location.href = `${config.public.apiBase}/auth/google`;
}
</script>

<template>
  <div class="w-full h-full flex flex-col items-center justify-center">
    <UiCrossCard class="p-4">
      <div class="w-full flex flex-col items-center justify-center">
        <h1 class="w-fit text-2xl font-bold">
          {{ $t("page.authentication.login") }}
        </h1>
        <div class="w-fit flex flex-row text-s font-light text-muted mt-2 mb-6">
          {{ $t("page.authentication.noAccount") }}&nbsp;
          <ULink
            class="text-s font-light text-primary hover:text-primary"
            :to="$localePath('/register')"
          >
            {{ $t("page.authentication.register") }}
          </ULink>
          .
        </div>

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

        <UForm :state="state" class="w-80 h-fit" method="post" @submit="onSubmit">
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
            :label="$t('page.authentication.logIn')"
            color="neutral"
            type="submit"
            class="w-full flex flex-col items-center cursor-pointer"
          />
        </UForm>
      </div>
    </UiCrossCard>
  </div>
</template>
