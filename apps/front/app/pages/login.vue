<script lang="ts" setup>
import { getApiErrorMessage } from "@sarpbc/utils";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
setPageSeo({
  title: t("page.login.seoTitle"),
  description: t("page.login.seoDescription"),
  noIndex: true,
});
const { leaveIfSignedIn, submit, googleLogin } = useAuthFlow();

interface LoginState {
  email: string;
  password: string;
}

const state = reactive<LoginState>({
  email: "",
  password: "",
});

const pending = ref(false);
const errorMessage = ref<string | null>(null);

onMounted(leaveIfSignedIn);

async function onSubmit(event: Event) {
  event.preventDefault();
  if (pending.value) {
    return;
  }

  pending.value = true;
  errorMessage.value = null;

  try {
    const signedIn = await submit(
      "/auth/login",
      { email: state.email.trim(), password: state.password },
      "user_logged_in",
    );
    if (!signedIn) {
      errorMessage.value = t("page.authentication.errors.loginFailed");
    }
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error) ?? t("page.authentication.errors.loginFailed");
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="w-full h-full flex flex-col items-center justify-center px-2">
    <SCrossCard class="w-full max-w-88 p-4">
      <div class="w-full flex flex-col items-center justify-center">
        <h1 class="w-fit text-xl font-medium tracking-tight">
          {{ $t("page.authentication.login") }}
        </h1>
        <div class="w-fit flex flex-row text-sm text-muted mt-2 mb-6">
          {{ $t("page.authentication.noAccount") }}&nbsp;
          <SLink variant="accent" :to="$localePath('/register')">
            {{ $t("page.authentication.register") }}
          </SLink>
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

          <p v-if="errorMessage" role="alert" class="-mt-4 mb-4 text-sm text-error">
            {{ errorMessage }}
          </p>

          <UButton
            :label="pending ? $t('page.authentication.loggingIn') : $t('page.authentication.logIn')"
            color="primary"
            size="lg"
            type="submit"
            :loading="pending"
            :disabled="pending"
            class="w-full flex flex-col items-center"
          />
        </UForm>
      </div>
    </SCrossCard>
  </div>
</template>
