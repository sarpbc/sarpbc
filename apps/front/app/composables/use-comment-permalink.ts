import { isNonEmptyString } from "@sarpbc/utils";
import { commentAnchorId, commentPermalinkHash, parseCommentHash } from "~/utils/comment-permalink";

const focusCommentElement = (commentId: string): HTMLElement | null => {
  const element = document.querySelector<HTMLElement>(`#${CSS.escape(commentAnchorId(commentId))}`);

  if (!element) {
    return null;
  }

  element.setAttribute("tabindex", "-1");
  element.focus({ preventScroll: true });

  return element;
};

const scrollToComment = (commentId: string): boolean => {
  const element = document.querySelector<HTMLElement>(`#${CSS.escape(commentAnchorId(commentId))}`);

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
};

export const useCommentPermalink = () => {
  const route = useRoute();
  const router = useRouter();

  const highlightedCommentId = ref<string | null>(null);
  let highlightTimeout: ReturnType<typeof setTimeout> | null = null;

  const clearHighlightTimer = () => {
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
      highlightTimeout = null;
    }
  };

  const highlightComment = (commentId: string) => {
    clearHighlightTimer();
    highlightedCommentId.value = commentId;
    highlightTimeout = setTimeout(() => {
      highlightedCommentId.value = null;
      highlightTimeout = null;
    }, HIGHLIGHT_MS);
  };

  const navigateToComment = (commentId: string) => {
    void router.replace({ hash: commentPermalinkHash(commentId) });
    void nextTick(() => {
      if (scrollToComment(commentId)) {
        highlightComment(commentId);
      }
    });
  };

  const tryScrollFromHash = () => {
    const commentId = parseCommentHash(route.hash);

    if (isNonEmptyString(commentId) && scrollToComment(commentId)) {
      highlightComment(commentId);
    }
  };

  onBeforeUnmount(clearHighlightTimer);

  return {
    highlightedCommentId,
    navigateToComment,
    tryScrollFromHash,
  };
};
