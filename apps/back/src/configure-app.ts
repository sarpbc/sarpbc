import { ValidationPipe } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";

export const VALIDATION_PIPE_OPTIONS = {
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
} as const;

export async function configureApp(app: NestFastifyApplication): Promise<void> {
  app.enableCors({
    origin: [
      "http://localhost:4000",
      "http://localhost:4001",
      "http://localhost:4002",
      "https://sarpbc.org",
      "https://www.sarpbc.org",
      "https://admin.sarpbc.org",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });
  await app.register(cookie);

  app.enableShutdownHooks();
}
