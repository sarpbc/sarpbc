import { commentAnchorId, commentPermalinkHash, parseCommentHash } from "~/utils/commentPermalink";

export function useCommentPermalink() {
  const route = useRoute();
  const router = useRouter();

  const highlightedCommentId = ref<string | null>(null);
  let highlightTimeout: ReturnType<typeof setTimeout> | null = null;

  function clearHighlightTimer() {
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
      highlightTimeout = null;
    }
  }

  function focusCommentElement(commentId: string): HTMLElement | null {
    const element = document.getElementById(commentAnchorId(commentId));
    if (!element) {
      return null;
    }

    element.setAttribute("tabindex", "-1");
    element.focus({ preventScroll: true });
    return element;
  }

  function scrollToComment(commentId: string): boolean {
    const element = document.getElementById(commentAnchorId(commentId));
    if (!element) {
      return false;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
    focusCommentElement(commentId);
    return true;
  }

  function highlightComment(commentId: string) {
    clearHighlightTimer();
    highlightedCommentId.value = commentId;
    highlightTimeout = setTimeout(() => {
      highlightedCommentId.value = null;
      highlightTimeout = null;
    }, 2000);
  }

  function navigateToComment(commentId: string) {
    void router.replace({ hash: commentPermalinkHash(commentId) });
    nextTick(() => {
      if (scrollToComment(commentId)) {
        highlightComment(commentId);
      }
    });
  }

  function tryScrollFromHash(): string | null {
    const commentId = parseCommentHash(route.hash);
    if (!commentId) {
      return null;
    }

    if (scrollToComment(commentId)) {
      highlightComment(commentId);
      return commentId;
    }

    return commentId;
  }

  onBeforeUnmount(clearHighlightTimer);

  return {
    highlightedCommentId,
    navigateToComment,
    tryScrollFromHash,
    highlightComment,
  };
}
