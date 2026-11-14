import { z } from "zod";

export const isoDateSchema = z.union([z.iso.date(), z.iso.datetime({ local: true, offset: true })]);
