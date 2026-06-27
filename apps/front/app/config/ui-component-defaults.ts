/**
 * Default props for Nuxt UI components (via UTheme).
 * @see https://ui.nuxt.com/docs/components/theme
 */
export const uiComponentDefaults = {
  select: {
    content: {
      bodyLock: false,
    },
  },
  selectMenu: {
    content: {
      bodyLock: false,
      disableOutsidePointerEvents: false,
    },
  },
  inputMenu: {
    content: {
      bodyLock: false,
      disableOutsidePointerEvents: false,
    },
  },
} as const;
