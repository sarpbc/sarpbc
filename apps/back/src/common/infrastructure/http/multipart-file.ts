import { canonicalImageContentType } from "@sarpbc/utils";
import { MultipartFile } from "@fastify/multipart";
import { FileValidator } from "@nestjs/common/pipes/file/file-validator.interface";
import { FileTypeValidator, MaxFileSizeValidator } from "@nestjs/common";
import type { Storage } from "./fastify";

export class MultipartOptions {
  constructor(
    public maxFileSize?: number,
    public fileType?: string | RegExp,
  ) {}
}

export const getFileFromPart = async (part: MultipartFile): Promise<Storage.MultipartFile> => {
  const buffer = await part.toBuffer();

  return {
    buffer,
    size: buffer.byteLength,
    filename: part.filename,
    mimetype: canonicalImageContentType(part.mimetype),
    fieldname: part.fieldname,
  };
};

export const validateFile = async (
  file: Storage.MultipartFile,
  options: MultipartOptions,
): Promise<string | undefined> => {
  const validators: FileValidator[] = [];

  if (options.maxFileSize !== undefined && options.maxFileSize !== 0)
    validators.push(new MaxFileSizeValidator({ maxSize: options.maxFileSize }));

  if (options.fileType !== undefined && options.fileType !== "")
    validators.push(new FileTypeValidator({ fileType: options.fileType }));

  for (const validator of validators) {
    if (await validator.isValid(file)) continue;

    return validator.buildErrorMessage(file);
  }

  return undefined;
};
