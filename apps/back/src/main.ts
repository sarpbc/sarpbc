import { NestFactory } from "@nestjs/core";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { initLogger } from "evlog";
import { AppModule } from "./app.module";
import { loadEnv } from "./infrastructure/config/env.validation";
import { configureApp } from "./configure-app";
import { createHttpAdapter } from "./infrastructure/http/fastify-adapter";

const { NODE_ENV, production } = loadEnv();

const loggerEnv = {
  service: "sarpbc-back",
  environment: NODE_ENV,
};

if (production) {
  initLogger({
    env: loggerEnv,
    sampling: {
      rates: {
        info: 5,
        warn: 50,
        debug: 0,
        error: 100,
      },
      keep: [{ duration: 1000 }, { status: 400 }],
    },
  });
} else {
  initLogger({
    env: loggerEnv,
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, createHttpAdapter());

  const configService = app.get(ConfigService);
  await configureApp(app, configService.getOrThrow<string[]>("corsOrigins"));

  await app.listen(configService.getOrThrow<number>("port"), "0.0.0.0");
}

bootstrap();
