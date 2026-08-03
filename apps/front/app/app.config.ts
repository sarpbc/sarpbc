export default defineAppConfig({
  title: "sarpbc.org",
  toaster: {
    position: "bottom-right" as const,
    expand: true,
    duration: 5000,
  },
  ui: {
    colors: {
      primary: "blue",
      neutral: "ink",
    },
    breadcrumb: {
      variants: {
        active: {
          true: { link: "text-highlighted font-semibold" },
        },
      },
    },
  },
});
