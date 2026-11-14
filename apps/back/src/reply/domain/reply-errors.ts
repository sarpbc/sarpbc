import { FORUM_ERROR_CODES } from "@sarpbc/types";
import { ConflictError } from "../../common/domain/errors/conflict-error";

export const replyAlreadyReported = () =>
  new ConflictError({
    message: "You already reported this comment.",
    code: FORUM_ERROR_CODES.REPLY_ALREADY_REPORTED,
  });

export const replyStillReferenced = () =>
  new ConflictError(
    "This comment could not be deleted because it is still referenced. Hide it instead.",
  );
