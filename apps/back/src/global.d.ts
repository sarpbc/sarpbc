import type { CookieSerializeOptions, UnsignResult } from "@fastify/cookie";

declare namespace Storage {
  interface MultipartFile {
    buffer: Buffer;
    filename: string;
    size: number;
    mimetype: string;
    fieldname: string;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    storedFiles: Record<string, Storage.MultipartFile[]>;
    body: unknown;
    user?: {
      id: string;
      email: string;
    };
  }

  interface FastifyReply {
    setCookie(name: string, value: string, options?: CookieSerializeOptions): this;

    cookie(name: string, value: string, options?: CookieSerializeOptions): this;

    clearCookie(name: string, options?: CookieSerializeOptions): this;

    unsignCookie(value: string): UnsignResult;
  }
}
