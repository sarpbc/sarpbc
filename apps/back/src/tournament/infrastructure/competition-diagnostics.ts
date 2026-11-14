import { log } from "evlog";
import type { CompetitionDiagnostics } from "../application/ports";

export const competitionDiagnostics: CompetitionDiagnostics = {
  error(message, error) {
    log.error({
      component: "Competition",
      message,
      error: error instanceof Error ? error : new Error(String(error)),
    });
  },
  warn(message, context) {
    log.warn({ component: "Competition", message, ...context });
  },
};
