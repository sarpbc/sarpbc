import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { initLogger } from "evlog";
import { AppModule } from "./app.module";
import { configureApp } from "./configure-app";

const isProduction = process.env.NODE_ENV === "production";

const loggerEnv = {
  service: "sarpbc-back",
  environment: process.env.NODE_ENV ?? "development",
};

if (isProduction) {
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
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  await configureApp(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("port") ?? 4001;

  await app.listen(port, "0.0.0.0");
}

bootstrap();
