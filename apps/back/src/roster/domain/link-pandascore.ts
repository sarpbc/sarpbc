import type { DataSource } from "@sarpbc/types";

export function linkPandascore(
  target: { pandascoreId: number | null; source: DataSource },
  pandascoreId: number,
): void {
  target.pandascoreId = pandascoreId;
  target.source = "pandascore";
}
