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
    button: {
      slots: {
        base: "active:scale-[0.97] transition-[color,background-color,border-color,transform] duration-(--duration-fast) ease-out motion-reduce:active:scale-100",
      },
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
