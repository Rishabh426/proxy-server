import { z } from "zod"

export const workerMessgageSchema = z.object( {
    requesttype: z.enum(['HTTP']),
    headers: z.any(),
    body: z.any(),
    url: z.string(),
});

export const workerMessgageReplySchema = z.object( {
    data: z.string().optional(),
    error: z.string().optional(),
    errorcode: z.enum(['500', '404']).optional(),

});
export type workerMessgageType = z.infer<typeof workerMessgageSchema>;
export type workerMessgageReplyType = z.infer<typeof workerMessgageReplySchema>;