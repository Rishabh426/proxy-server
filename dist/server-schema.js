"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workerMessgageSchema = void 0;
const zod_1 = require("zod");
exports.workerMessgageSchema = zod_1.z.object({
    requesttype: zod_1.z.enum(['HTTP']),
    headers: zod_1.z.any(),
    body: zod_1.z.any(),
    url: zod_1.z.string(),
});
