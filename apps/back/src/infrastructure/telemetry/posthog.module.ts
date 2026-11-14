import { Global, Module } from "@nestjs/common";
import { PostHogService } from "./posthog.service";

@Global()
@Module({
  exports: [PostHogService],
  providers: [PostHogService],
})
export class PostHogModule {}
