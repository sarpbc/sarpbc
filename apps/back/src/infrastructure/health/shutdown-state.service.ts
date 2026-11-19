import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

const SHUTDOWN_SIGNALS = ["SIGTERM", "SIGINT"] as const;

@Injectable()
export class ShutdownStateService implements OnModuleInit, OnModuleDestroy {
  private shuttingDown = false;

  private readonly onSignal = () => {
    this.shuttingDown = true;
  };

  onModuleInit() {
    for (const signal of SHUTDOWN_SIGNALS) {
      process.once(signal, this.onSignal);
    }
  }

  onModuleDestroy() {
    this.shuttingDown = true;

    for (const signal of SHUTDOWN_SIGNALS) {
      process.removeListener(signal, this.onSignal);
    }
  }

  isShuttingDown() {
    return this.shuttingDown;
  }
}
