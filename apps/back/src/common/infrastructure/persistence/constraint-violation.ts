import {
  ForeignKeyConstraintViolationException,
  UniqueConstraintViolationException,
} from "@mikro-orm/core";

export const isUniqueViolation = (cause: unknown): cause is UniqueConstraintViolationException =>
  cause instanceof UniqueConstraintViolationException;

export const isForeignKeyViolation = (
  cause: unknown,
): cause is ForeignKeyConstraintViolationException =>
  cause instanceof ForeignKeyConstraintViolationException;
