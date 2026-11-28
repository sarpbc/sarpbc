<script lang="ts" setup>
import { getApiErrorMessage } from "@sarpbc/utils";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

setPageSeo({
  description: t("page.register.seoDescription"),
  noIndex: true,
  title: t("page.register.seoTitle"),
});

const { leaveIfSignedIn, submit, googleLogin } = useAuthFlow();

interface RegisterState {
  userName: string;
  email: string;
  password: string;
}

const state = reactive<RegisterState>({
  email: "",
  password: "",
  userName: "",
});

const errorMessage = ref<string | null>(null);

onMounted(leaveIfSignedIn);

// oxlint-disable-next-line landmines-style/no-comments
/**
 * Create a sarpbc.org account. Use when the user has no account yet and wants to comment, post on the forum or play pick'ems.
 * @tool confirm
 */
const createAccount = async (event: Event) => {
  event.preventDefault();
  errorMessage.value = null;

  try {
    const signedUp = await submit(
      "/auth/signup",
      { email: state.email, password: state.password, userName: state.userName },
      "user_signed_up",
    );

    if (!signedUp) {
      errorMessage.value = t("page.authentication.errors.signUpFailed");
    }
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error) ?? t("page.authentication.errors.signUpFailed");
  }
};
</script>

<template>
  <div class="w-full h-full flex flex-col items-center justify-center px-2">
    <HubCrossCard class="w-full max-w-88 p-4">
      <div class="w-full flex flex-col items-center justify-center">
        <h1 class="w-fit text-xl font-medium tracking-tight">
          {{ $t("page.authentication.register") }}
        </h1>
        <div class="w-fit flex flex-row text-sm text-muted mt-2 mb-12">
          {{ $t("page.authentication.alreadyHaveAnAccount") }}&nbsp;
          <SLink variant="secondary" :to="$localePath('/login')">
            {{ $t("page.authentication.login") }}
          </SLink>
          .
        </div>

        <SButton
          icon="i-logos-google-icon"
          :label="$t('page.authentication.continueWithGoogle')"
          variant="secondary"
          block
          @click="googleLogin"
        />

        <SSeparator :label="$t('page.authentication.or')" class="my-6" />

        <form class="w-full h-fit" method="post" @submit="createAccount">
          <SFormField :label="$t('page.authentication.userName')" class="w-full pb-4">
            <SInput v-model="state.userName" type="text" class="w-full" />
          </SFormField>

          <SFormField :label="$t('page.authentication.email')" class="w-full pb-4">
            <SInput v-model="state.email" type="email" class="w-full" />
          </SFormField>

          <SFormField :label="$t('page.authentication.password')" class="w-full pb-8">
            <SInput v-model="state.password" type="password" class="w-full" />
          </SFormField>

          <p v-if="errorMessage" role="alert" class="-mt-4 mb-4 text-sm text-error">
            {{ errorMessage }}
          </p>

          <SButton :label="$t('page.authentication.toRegister')" type="submit" block />
        </form>
      </div>
    </HubCrossCard>
  </div>
</template>
