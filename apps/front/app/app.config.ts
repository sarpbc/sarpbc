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
        base: "transition-colors duration-(--duration-fast) ease-out active:transition-none",
      },
      compoundVariants: [
        {
          color: "neutral",
          variant: "solid",
          class: "active:bg-(--ui-bg-inverted-pressed)",
        },
        {
          color: "neutral",
          variant: "outline",
          class: "ring-default",
        },
      ],
    },
    modal: {
      slots: {
        title: "font-medium",
      },
    },
    error: {
      slots: {
        statusCode: "font-medium",
        statusMessage: "font-medium",
      },
    },
  },
});
