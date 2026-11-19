import { readFile } from "node:fs/promises";
import { z } from "zod";

const pixel = z.number().int().min(0);
const byte = z.number().int().min(0).max(255);

const regionSchema = z.object({
  height: pixel.min(1),
  width: pixel.min(1),
  x: pixel,
  y: pixel,
});

const anchorSchema = z.object({
  color: z.tuple([byte, byte, byte]),
  region: regionSchema,
  tolerance: z.number().positive(),
});

const templateSchema = z.object({
  char: z.string().regex(/^[0-9:+]$/u),
  rows: z.array(z.string().regex(/^[.#]+$/u)).min(1),
});

const overlaySchema = z
  .object({
    glyph: z.object({ height: pixel.min(1), width: pixel.min(1) }),
    id: z.string().regex(/^[a-z0-9-]+$/u),
    ignoreWhen: z.array(anchorSchema),
    name: z.string().min(1),
    reference: z.object({ height: pixel.min(1), width: pixel.min(1) }),
    regions: z.object({
      blue: regionSchema,
      clock: regionSchema,
      orange: regionSchema,
    }),
    templates: z.array(templateSchema).min(1),
    text: z.object({
      minConfidence: z.number().min(0).max(1),
      threshold: byte,
    }),
    visibleWhen: z.array(anchorSchema).min(1),
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

export const parseOverlay = (text: string) => overlaySchema.parse(JSON.parse(text));

export const loadOverlay = async (path: string) => parseOverlay(await readFile(path, "utf-8"));

/** Swaps the templates in the stored file's own key order, which the schema's sorted shape would lose. */
export const overlayWithTemplates = (text: string, templates: readonly GlyphTemplate[]) =>
  `${JSON.stringify({ ...z.record(z.string(), z.unknown()).parse(JSON.parse(text)), templates }, null, 2)}\n`;
