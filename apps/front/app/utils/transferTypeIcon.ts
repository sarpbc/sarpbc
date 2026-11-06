import type { TransferType } from "@sarpbc/types";

export function transferTypeIcon(type: TransferType): string {
  switch (type) {
    case "arrival":
      return "i-fluent-arrow-down-24-regular";
    case "departure":
      return "i-fluent-arrow-up-24-regular";
    case "benched":
      return "i-fluent-pause-24-regular";
    case "loan":
      return "i-fluent-arrow-swap-24-regular";
    case "staff":
      return "i-fluent-briefcase-24-regular";
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}
