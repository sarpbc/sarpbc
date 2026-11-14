export default defineAppConfig({
  title: "sarpbc.org Admin",
  toaster: {
    duration: 5000,
    expand: true,
    position: "bottom-right" as const,
  },
  ui: {
    breadcrumb: {
      variants: {
        active: {
          true: { link: "text-highlighted font-semibold" },
        },
      },
    },
    colors: {
      neutral: "ink",
      primary: "blue",
    },
    table: {
      slots: {
        base: "min-w-full border-collapse",
        empty: "py-8 text-center text-sm text-muted",
        tbody: "[&>tr]:last:[&>td]:border-b-0",
        td: "h-row px-3 py-0 text-sm text-muted whitespace-nowrap border-b border-default",
        th: "h-row px-3 py-0 text-sm text-highlighted text-left font-semibold whitespace-nowrap border-b border-default",
        thead: "[&>tr]:after:content-none [&>tr:nth-child(n+2)]:hidden",
      },
    },
  },
});
