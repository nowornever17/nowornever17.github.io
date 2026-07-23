import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title:       z.string(),
    subtitle:    z.string().optional(),
    date:        z.date(),
    issue:       z.string().optional(),
    category:    z.string().optional(),
    readingTime: z.string().optional(),
    cover:       z.string().optional(),
    excerpt:     z.string().optional(),
    module:      z.enum(['threshold', 'lab', 'archive']).default('archive'),
    // Legacy compat
    tag:         z.string().optional(),
    redirect:    z.string().optional(),
  }),
});

export const collections = { blog };
