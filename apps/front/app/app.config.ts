export default defineAppConfig({
  title: "sarpbc.org",
  toaster: {
    duration: 5000,
    expand: true,
    position: "bottom-right" as const,
  },
  ui: {
    button: {
      compoundVariants: [
        {
          class: "active:bg-(--ui-bg-inverted-pressed)",
          color: "neutral",
          variant: "solid",
        },
        {
          class: "ring-default",
          color: "neutral",
          variant: "outline",
        },
      ],
      slots: {
        base: "transition-colors duration-(--duration-fast) ease-out active:transition-none",
      },
    },
    colors: {
      neutral: "ink",
      primary: "blue",
    },
    error: {
      slots: {
        statusCode: "font-medium",
        statusMessage: "font-medium",
      },
    },
    modal: {
      slots: {
        title: "font-medium",
      },
    },
  },
});
