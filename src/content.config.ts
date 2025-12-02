import { defineCollection, z } from "astro:content";

const affordancesCollection = defineCollection({
    type: "content",
    schema: z.object({
        title: z.string(),
        description: z.string(),
    }),
});

const pagesCollection = defineCollection({
    type: "content",
    schema: z.object({
        title: z.string(),
        slug: z.string().optional(),
        layout: z.string().optional(),
        layoutType: z.enum(["base", "affordances"]).optional().default("base"),
    }),
});

const siteCollection = defineCollection({
    type: "content",
    schema: z.object({
        title: z.string(),
    }),
});

export const collections = {
    affordances: affordancesCollection,
    pages: pagesCollection,
    site: siteCollection,
};
