export default defineAppConfig({
  title: "SARPBC Admin",
  toaster: {
    position: "bottom-right" as const,
    expand: true,
    duration: 5000,
  },
  ui: {
    colors: {
      primary: "blue",
      neutral: "zinc",
    },
  },
});
