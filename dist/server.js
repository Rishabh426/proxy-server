"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createserver = createserver;
const node_cluster_1 = __importDefault(require("node:cluster"));
const node_http_1 = __importDefault(require("node:http"));
const server_schema_1 = require("./server-schema");
const server_schema_2 = require("./server-schema");
function createserver(config) {
    return __awaiter(this, void 0, void 0, function* () {
        const WORKER_POOL = [];
        const { workerCount } = config;
        if (node_cluster_1.default.isPrimary) {
            console.log("Master process is on");
            for (let i = 0; i < workerCount; i++) {
                const w = node_cluster_1.default.fork({ config: JSON.stringify(config.config) });
                WORKER_POOL.push(w);
                console.log(`Master process : Worker node spinned up ${i}`);
            }
            const server = node_http_1.default.createServer((req, res) => {
                const index = Math.floor(Math.random() * WORKER_POOL.length);
                const worker = WORKER_POOL.at(index);
                if (!worker)
                    throw new Error(`Worker not found`);
                const payload = {
                    requesttype: 'HTTP',
                    headers: req.headers,
                    body: null,
                    url: `${req.url}`,
                };
                worker.send(JSON.stringify(payload));
                worker.on('message', (workerreply) => __awaiter(this, void 0, void 0, function* () {
                    const reply = yield server_schema_2.workerMessgageReplySchema.parseAsync(JSON.parse(workerreply));
                    if (reply.errorcode) {
                        res.writeHead(parseInt(reply.errorcode));
                        res.end(reply.error);
                        return;
                    }
                    else {
                        res.writeHead(200);
                        res.end(reply.data);
                        return;
                    }
                }));
            });
            server.listen(config.port, () => console.log(`reverse proxy on port ${config.port}`));
        }
        else {
            console.log(`Worker node`);
            const config = JSON.parse(`${process.env.config}`);
            process.on('message', (m) => __awaiter(this, void 0, void 0, function* () {
                const messagevalidated = yield server_schema_1.workerMessgageSchema.parseAsync(JSON.parse(m));
                // console.log(`WORKER`, m);
                const requrl = messagevalidated.url;
                const rule = config.server.rules.find(e => e.path === requrl);
                if (!rule) {
                    const reply = {
                        errorcode: "404",
                        error: `Rule not found`,
                    };
                    if (process.send)
                        return process.send(JSON.stringify(reply));
                }
                const upstreamID = rule === null || rule === void 0 ? void 0 : rule.upstreams[0];
                const upstream = config.server.upstreams.find(e => e.id === upstreamID);
                if (!upstreamID) {
                    const reply = {
                        errorcode: "500",
                        error: `Upstream not found`,
                    };
                    if (process.send)
                        return process.send(JSON.stringify(reply));
                }
                const request = node_http_1.default.request({
                    host: upstream === null || upstream === void 0 ? void 0 : upstream.url,
                    path: requrl,
                }, (proxyRes) => {
                    let body = '';
                    proxyRes.on('data', (chunk) => {
                        body += chunk;
                    });
                    proxyRes.on('end', () => {
                        const reply = {
                            data: body,
                        };
                        if (process.send)
                            return process.send(JSON.stringify(reply));
                    });
                });
                request.end();
            }));
        }
    });
}
