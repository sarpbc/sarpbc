import type { DataSource } from "@sarpbc/types";

export const linkPandascore = (
  target: { pandascoreId: number | null; source: DataSource },
  pandascoreId: number,
) => {
  target.pandascoreId = pandascoreId;
  target.source = "pandascore";
};
