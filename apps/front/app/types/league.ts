import type { League as SharedLeague } from "@sarpbc/types";
import type { Tournament } from "./tournament";

export type League = Omit<SharedLeague, "tournaments"> & {
  tournaments?: Tournament[];
};
