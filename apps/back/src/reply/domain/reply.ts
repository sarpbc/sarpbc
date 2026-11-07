import { forumPostPath, forumPostSlug, matchPath, newsPath } from "@sarpbc/utils";
import { REPLY_TARGET_TYPES, type ReplyTargetType } from "@sarpbc/types";
import { InvalidInputError } from "../../common/domain/errors";

export type ReplyTarget = { kind: ReplyTargetType; id: string };

export interface ReplyTargetFields {
  post: { id: string; publicId: number; title: string } | null;
  newsArticle: { id: string; title: string; slug: string } | null;
  match: { id: string; publicId: number; name: string; slug: string } | null;
}

export type ReplyTargetLink = {
  targetType: ReplyTargetType;
  targetId: string;
  targetLabel: string;
  targetPath: string;
};

interface ReplyTargetSpec {
  field: keyof ReplyTargetFields;
  inputKey: "postId" | "newsArticleId" | "matchId";
  label: string;
  sortOrder: "asc" | "desc";
  describe(fields: ReplyTargetFields): { id: string; label: string; path: string } | null;
}

function replyTargetSpec<F extends keyof ReplyTargetFields>(spec: {
  field: F;
  inputKey: ReplyTargetSpec["inputKey"];
  label: string;
  sortOrder: ReplyTargetSpec["sortOrder"];
  link: (target: NonNullable<ReplyTargetFields[F]>) => { id: string; label: string; path: string };
}): ReplyTargetSpec {
  const { link, ...rest } = spec;
  return {
    ...rest,
    describe(fields) {
      const target = fields[spec.field];
      return target ? link(target) : null;
    },
  };
}

export const REPLY_TARGETS = {
  forumPost: replyTargetSpec({
    field: "post",
    inputKey: "postId",
    label: "Forum post",
    sortOrder: "asc",
    link: (post) => ({
      id: post.id,
      label: post.title,
      path: forumPostPath(post.publicId, forumPostSlug(post.title)),
    }),
  }),
  newsArticle: replyTargetSpec({
    field: "newsArticle",
    inputKey: "newsArticleId",
    label: "News article",
    sortOrder: "desc",
    link: (article) => ({ id: article.id, label: article.title, path: newsPath(article.slug) }),
  }),
  match: replyTargetSpec({
    field: "match",
    inputKey: "matchId",
    label: "Match",
    sortOrder: "desc",
    link: (match) => ({
      id: match.id,
      label: match.name,
      path: matchPath(match.publicId, match.slug),
    }),
  }),
} satisfies Record<ReplyTargetType, ReplyTargetSpec>;

export function replyTarget(input: {
  postId?: string;
  newsArticleId?: string;
  matchId?: string;
}): ReplyTarget {
  const targets = REPLY_TARGET_TYPES.flatMap((kind) => {
    const id = input[REPLY_TARGETS[kind].inputKey];
    return id ? [{ kind, id }] : [];
  });
  if (targets.length !== 1)
    throw new InvalidInputError("Provide exactly one of postId, newsArticleId, or matchId.");
  return targets[0]!;
}

export function sameReplyTarget(
  child: Record<keyof ReplyTargetFields, { id: string } | null>,
  parent: Record<keyof ReplyTargetFields, { id: string } | null>,
): boolean {
  return REPLY_TARGET_TYPES.some((kind) => {
    const { field } = REPLY_TARGETS[kind];
    const id = child[field]?.id;
    return Boolean(id) && parent[field]?.id === id;
  });
}

export function replySortOrder(kind: ReplyTargetType): "asc" | "desc" {
  return REPLY_TARGETS[kind].sortOrder;
}

export function resolveReplyTargetLink(reply: ReplyTargetFields): ReplyTargetLink | null {
  for (const kind of REPLY_TARGET_TYPES) {
    const link = REPLY_TARGETS[kind].describe(reply);
    if (link) {
      return {
        targetType: kind,
        targetId: link.id,
        targetLabel: link.label,
        targetPath: link.path,
      };
    }
  }
  return null;
}
