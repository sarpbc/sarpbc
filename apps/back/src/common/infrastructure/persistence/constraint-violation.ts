import {
  ForeignKeyConstraintViolationException,
  UniqueConstraintViolationException,
} from "@mikro-orm/core";

export const isUniqueViolation = (error: unknown): error is UniqueConstraintViolationException =>
  error instanceof UniqueConstraintViolationException;

export const isForeignKeyViolation = (
  error: unknown,
): error is ForeignKeyConstraintViolationException =>
  error instanceof ForeignKeyConstraintViolationException;
