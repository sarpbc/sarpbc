import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

const SHUTDOWN_SIGNALS = ["SIGTERM", "SIGINT"] as const;

@Injectable()
export class ShutdownStateService implements OnModuleInit, OnModuleDestroy {
  private shuttingDown = false;

  private readonly onSignal = (): void => {
    this.shuttingDown = true;
  };

  onModuleInit(): void {
    for (const signal of SHUTDOWN_SIGNALS) {
      process.once(signal, this.onSignal);
    }
  }

  onModuleDestroy(): void {
    this.shuttingDown = true;
    for (const signal of SHUTDOWN_SIGNALS) {
      process.removeListener(signal, this.onSignal);
    }
  }

  isShuttingDown(): boolean {
    return this.shuttingDown;
  }
}
