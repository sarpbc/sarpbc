import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  app.enableCors({
    origin: [
      "http://localhost:4000",
      "http://localhost:4001",
      "https://sarpbc.org",
      "https://www.sarpbc.org",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.register(multipart);
  await app.register(cookie);

  const port = process.env.PORT ?? 4001;

  await app.listen(port, "0.0.0.0");
}

bootstrap();
