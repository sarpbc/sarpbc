import { readFile } from "node:fs/promises";
import { z } from "zod";

const pixel = z.number().int().min(0);
const byte = z.number().int().min(0).max(255);

const regionSchema = z.object({
  x: pixel,
  y: pixel,
  width: pixel.min(1),
  height: pixel.min(1),
});

const anchorSchema = z.object({
  region: regionSchema,
  color: z.tuple([byte, byte, byte]),
  tolerance: z.number().positive(),
});

const templateSchema = z.object({
  char: z.string().regex(/^[0-9:+]$/u),
  rows: z.array(z.string().regex(/^[.#]+$/u)).min(1),
});

const overlaySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/u),
    name: z.string().min(1),
    reference: z.object({ width: pixel.min(1), height: pixel.min(1) }),
    text: z.object({
      threshold: byte,
      minConfidence: z.number().min(0).max(1),
    }),
    regions: z.object({
      blue: regionSchema,
      orange: regionSchema,
      clock: regionSchema,
    }),
    visibleWhen: z.array(anchorSchema).min(1),
    ignoreWhen: z.array(anchorSchema),
    glyph: z.object({ width: pixel.min(1), height: pixel.min(1) }),
    templates: z.array(templateSchema).min(1),
  })
  .refine(
    (overlay) =>
      overlay.templates.every(
        (template) =>
          template.rows.length === overlay.glyph.height &&
          template.rows.every((row) => row.length === overlay.glyph.width),
      ),
    { message: "Every template must match the glyph size." },
  );

export type Region = z.infer<typeof regionSchema>;

export type Anchor = z.infer<typeof anchorSchema>;

export type GlyphTemplate = z.infer<typeof templateSchema>;

export type Overlay = z.infer<typeof overlaySchema>;

export const parseOverlay = (text: string): Overlay => overlaySchema.parse(JSON.parse(text));

export const loadOverlay = async (path: string): Promise<Overlay> =>
  parseOverlay(await readFile(path, "utf-8"));
