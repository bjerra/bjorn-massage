import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const rad = defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/rad' }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        slug: z.string()
    })
});

export const collections = { rad };
