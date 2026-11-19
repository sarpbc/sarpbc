import type { Author } from "../../common/domain/author";
import { REPLY_TARGETS, replySortOrder } from "../domain/reply";
import type { ReplyTarget, ReplyTargetFields } from "../domain/reply";
import type { ReplyRecord } from "./models";
import type {
  ReplyFindOptions,
  ReplyReportRecord,
  ReplyTransaction,
  ReplyWriteScope,
} from "./ports";

type ReplyTargetKind = ReplyTarget["kind"];

const inTarget = (reply: ReplyRecord, kind: ReplyTargetKind, id: string) =>
  reply[REPLY_TARGETS[kind].field]?.id === id;

const oldestFirst = (a: ReplyRecord, b: ReplyRecord) =>
  a.createdAt.getTime() - b.createdAt.getTime();

const inMemoryReplies = () => {
  const byId = new Map<string, ReplyRecord>();
  const saved: ReplyRecord[] = [];
  const deleted: string[] = [];

  const add = (reply: ReplyRecord) => {
    byId.set(reply.id, reply);
  };

  const visible = (kind: ReplyTargetKind, id: string, includeHidden = false) =>
    [...byId.values()].filter(
      (reply) => inTarget(reply, kind, id) && (includeHidden || reply.hiddenAt === null),
    );

  return {
    add,
    countByTargetIds: async (kind: ReplyTargetKind, ids: string[]) =>
      new Map(ids.map((id) => [id, visible(kind, id).length])),
    countRootsByTarget: async (kind: ReplyTargetKind, id: string) =>
      visible(kind, id).filter((reply) => reply.replyTo === null).length,
    delete: async (reply: ReplyRecord) => {
      deleted.push(reply.id);
      byId.delete(reply.id);
    },
    deleted,
    findById: async (id: string) => byId.get(id) ?? null,
    findByTarget: async (kind: ReplyTargetKind, id: string, options: ReplyFindOptions = {}) => {
      const direction = replySortOrder(kind) === "asc" ? 1 : -1;

      const matching = visible(kind, id, options.includeHidden)
        .filter((reply) => options.rootsOnly !== true || reply.replyTo === null)
        .toSorted((a, b) => direction * oldestFirst(a, b));

      const offset = options.offset ?? 0;

      return matching.slice(
        offset,
        options.limit === undefined ? undefined : offset + options.limit,
      );
    },
    findChildren: async (id: string) =>
      [...byId.values()].filter((reply) => reply.replyTo?.id === id),
    findDescendantsForRoots: async (kind: ReplyTargetKind, id: string, roots: string[]) => {
      const reached = new Set(roots);
      const descendants: ReplyRecord[] = [];
      const candidates = visible(kind, id).filter((reply) => reply.replyTo !== null);
      let grew = true;

      while (grew) {
        grew = false;

        for (const reply of candidates) {
          if (!reached.has(reply.id) && reached.has(reply.replyTo?.id ?? "")) {
            reached.add(reply.id);
            descendants.push(reply);
            grew = true;
          }
        }
      }

      return descendants;
    },
    findLatestByUser: async (id: string) =>
      [...byId.values()]
        .filter((reply) => reply.author.id === id)
        .toSorted((a, b) => oldestFirst(b, a))[0] ?? null,
    findRecentForModeration: async (limit: number) =>
      [...byId.values()]
        .toSorted((a, b) => oldestFirst(b, a))
        .slice(0, limit)
        .map((reply) => ({ reply, reportCount: 0 })),
    save: async (reply: ReplyRecord) => {
      saved.push(reply);
      add(reply);
    },
    saved,
  };
};

const inMemoryReports = () => {
  const all: ReplyReportRecord[] = [];
  const saved: ReplyReportRecord[] = [];

  return {
    add: (report: ReplyReportRecord) => {
      all.push(report);
    },
    findByReplyAndReporter: async (replyId: string, userId: string) =>
      all.find((report) => report.reply.id === replyId && report.reporter.id === userId) ?? null,
    save: async (report: ReplyReportRecord) => {
      saved.push(report);
      all.push(report);
    },
    saved,
  };
};

export class InMemoryReplyScope implements ReplyWriteScope, ReplyTransaction {
  readonly replies = inMemoryReplies();
  readonly reports = inMemoryReports();
  readonly notified: { recipientId: string; replyId: string }[] = [];
  commits = 0;
  private readonly authors = new Map<string, Author>();
  private readonly targetFields = new Map<string, ReplyTargetFields>();
  private notificationFailure: Error | null = null;

  readonly users = {
    findById: async (id: string) => this.authors.get(id) ?? null,
  };

  readonly targets = {
    find: async ({ kind, id }: ReplyTarget) => this.targetFields.get(`${kind}:${id}`) ?? null,
  };

  readonly notifications = {
    createForDirectReply: async (recipientId: string, replyId: string) => {
      if (this.notificationFailure) {
        throw this.notificationFailure;
      }

      this.notified.push({ recipientId, replyId });
    },
  };

  addUser(author: Author) {
    this.authors.set(author.id, author);
  }

  addTarget({ kind, id }: ReplyTarget, fields: ReplyTargetFields) {
    this.targetFields.set(`${kind}:${id}`, fields);
  }

  failNotificationsWith(error: Error) {
    this.notificationFailure = error;
  }

  async run<T>(work: (scope: ReplyWriteScope) => Promise<T>) {
    const result = await work(this);
    this.commits += 1;

    return result;
  }
}
