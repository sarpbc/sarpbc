/**
 * One click listener for a list of plain `<a href>` rows, so long lists get
 * client-side navigation without hydrating a NuxtLink per row.
 */
export function useLinkDelegation(onLinkClick?: (link: HTMLAnchorElement) => void) {
  const router = useRouter();

  return function onClick(event: MouseEvent) {
    if (!(event.target instanceof Element) || !(event.currentTarget instanceof Element)) {
      return;
    }
    const link = event.target.closest("a");
    if (!link || !event.currentTarget.contains(link)) {
      return;
    }

    onLinkClick?.(link);

    const opensElsewhere =
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      Boolean(link.target) ||
      link.origin !== window.location.origin;
    if (event.defaultPrevented || opensElsewhere) {
      return;
    }

    event.preventDefault();
    router.push(link.pathname + link.search + link.hash);
  };
}
