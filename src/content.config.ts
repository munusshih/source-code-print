import { defineCollection, z } from "astro:content";

const affordancesCollection = defineCollection({
    type: "content",
    schema: z.object({
        title: z.string(),
        description: z.string(),
    }),
});

export const collections = {
    affordances: affordancesCollection,
};
