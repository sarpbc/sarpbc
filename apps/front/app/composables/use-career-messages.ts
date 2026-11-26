const CAREER_MESSAGES = {
  en: async () => await import("~~/i18n/career/en-US.json"),
  fr: async () => await import("~~/i18n/career/fr-FR.json"),
};

const isCareerLocale = (code: string): code is keyof typeof CAREER_MESSAGES =>
  Object.hasOwn(CAREER_MESSAGES, code);

/**
 * Loads the RL Career translations, which stay out of the site-wide locale messages.
 */
export const useCareerMessages = async () => {
  const i18n = useI18n();

  const load = async (code: string) => {
    if (!isCareerLocale(code)) {
      return;
    }

    const { default: messages } = await CAREER_MESSAGES[code]();
    i18n.mergeLocaleMessage(code, messages);
  };

  watch(i18n.locale, async (code) => {
    await load(code);
  });

  await load(i18n.locale.value);
};
