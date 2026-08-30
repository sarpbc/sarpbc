export default defineAppConfig({
  title: "sarpbc.org Admin",
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
    table: {
      slots: {
        base: "min-w-full border-collapse",
        thead: "[&>tr]:after:content-none [&>tr:nth-child(n+2)]:hidden",
        tbody: "[&>tr]:last:[&>td]:border-b-0",
        th: "h-row px-3 py-0 text-sm text-highlighted text-left font-semibold whitespace-nowrap border-b border-default",
        td: "h-row px-3 py-0 text-sm text-muted whitespace-nowrap border-b border-default",
        empty: "py-8 text-center text-sm text-muted",
      },
    },
  },
});
