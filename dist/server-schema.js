"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workerMessgageReplySchema = exports.workerMessgageSchema = void 0;
const zod_1 = require("zod");
exports.workerMessgageSchema = zod_1.z.object({
    requesttype: zod_1.z.enum(['HTTP']),
    headers: zod_1.z.any(),
    body: zod_1.z.any(),
    url: zod_1.z.string(),
});
exports.workerMessgageReplySchema = zod_1.z.object({
    data: zod_1.z.string().optional(),
    error: zod_1.z.string().optional(),
    errorcode: zod_1.z.enum(['500', '404']).optional(),
});
