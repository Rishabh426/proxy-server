import { z } from "zod"

export const workerMessgageSchema = z.object( {
    requesttype: z.enum(['HTTP']),
    headers: z.any(),
    body: z.any(),
    url: z.string(),
});

export type workerMessgageType = z.infer<typeof workerMessgageSchema>;