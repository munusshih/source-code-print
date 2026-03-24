import { defineCollection, z } from "astro:content";
import { file } from "astro/loaders";

const records = defineCollection({
  loader: file("src/data/data.json", {
    parser: (text) => {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed?.items) ? parsed.items : [];
    },
  }),
  schema: z.object({
    type: z.string(),
    title: z.string(),
    link: z.string().optional().default(""),
    image: z.string().optional().default(""),
    fields: z.record(z.any()).optional().default({}),
  }),
});

export const collections = { records };
