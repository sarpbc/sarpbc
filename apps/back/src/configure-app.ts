import { StandardSchemaValidationPipe } from "@nestjs/common";
import { MAX_IMAGE_BYTES } from "@sarpbc/utils";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";

export const configureApp = async (app: NestFastifyApplication, corsOrigins: string[]) => {
  app.enableCors({
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    origin: corsOrigins,
  });

  app.useGlobalPipes(new StandardSchemaValidationPipe());

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    global: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: MAX_IMAGE_BYTES,
    },
  });
  await app.register(cookie);

  app.enableShutdownHooks();
};
