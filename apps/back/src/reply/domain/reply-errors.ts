import { FORUM_ERROR_CODES } from "@sarpbc/types";
import { ConflictError } from "../../common/domain/errors/conflict-error";

export const replyAlreadyReported = () =>
  new ConflictError({
    code: FORUM_ERROR_CODES.REPLY_ALREADY_REPORTED,
    message: "You already reported this comment.",
  });

export const replyStillReferenced = () =>
  new ConflictError(
    "This comment could not be deleted because it is still referenced. Hide it instead.",
  );
