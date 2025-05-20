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
const load_balancer_1 = require("./load-balancer");
function createserver(config) {
    return __awaiter(this, void 0, void 0, function* () {
        const WORKER_POOL = [];
        const { workerCount } = config;
        if (node_cluster_1.default.isPrimary) {
            console.log("Master process is on");
            for (let i = 0; i < workerCount; i++) {
                const w = node_cluster_1.default.fork({ config: JSON.stringify(config.config) });
                WORKER_POOL.push(w);
                console.log(`Master process : Worker node spinned up ${i} (PID: ${w.process.pid})`);
            }
            const algorithm = 'round-robin';
            const balancer = new load_balancer_1.LoadBalancer({
                algorithm,
                workers: WORKER_POOL,
            });
            const server = node_http_1.default.createServer((req, res) => {
                const clientIp = req.socket.remoteAddress || '127.0.0.1';
                const worker = balancer.getNextWorker(clientIp);
                if (!worker)
                    throw new Error(`Worker not found`);
                console.log(`[Master] Request ${req.url} routed to Worker PID: ${worker.process.pid}`);
                const payload = {
                    requesttype: 'HTTP',
                    headers: req.headers,
                    body: null,
                    url: `${req.url}`,
                };
                worker.send(JSON.stringify(payload));
                worker.once('message', (workerreply) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const parsed = JSON.parse(workerreply);
                        if (parsed.connectionClosed === true) {
                            console.log(`[Master] Connection closed on Worker PID: ${worker.process.pid}`);
                            return;
                        }
                        const reply = yield server_schema_2.workerMessgageReplySchema.parseAsync(parsed);
                        if (reply.errorcode) {
                            console.log(`[Master] Error response from Worker PID: ${worker.process.pid}, Code: ${reply.errorcode}`);
                            res.writeHead(parseInt(reply.errorcode));
                            res.end(reply.error);
                        }
                        else {
                            console.log(`[Master] Success response from Worker PID: ${worker.process.pid}`);
                            res.writeHead(200, { 'X-Worker-ID': `${worker.process.pid}` });
                            res.end(reply.data);
                        }
                    }
                    catch (error) {
                        console.error('[Master] Error processing worker reply:', error);
                        res.writeHead(500);
                        res.end('Internal Server Error');
                    }
                }));
            });
            server.listen(config.port, () => console.log(`[Master] Reverse proxy listening on port ${config.port}`));
        }
        else {
            console.log(`[Worker ${process.pid}] Started`);
            const config = JSON.parse(`${process.env.config}`);
            process.on('message', (m) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const messagevalidated = yield server_schema_1.workerMessgageSchema.parseAsync(JSON.parse(m));
                    const requrl = messagevalidated.url;
                    const userAgent = messagevalidated.headers['user-agent'];
                    const clientIp = messagevalidated.headers['x-forwarded-for'] || 'unknown';
                    if (clientIp === '123.45.67.89') {
                        console.log(`[Worker ${process.pid}] Headers for user ${clientIp}:`, messagevalidated.headers);
                    }
                    const rule = config.server.rules.find(e => e.path === requrl);
                    if (!rule) {
                        console.log(`[Worker ${process.pid}] Rule not found for ${requrl}`);
                        const reply = {
                            errorcode: "404",
                            error: `Rule not found`,
                        };
                        if (process.send) {
                            process.send(JSON.stringify(reply));
                            process.send(JSON.stringify({ connectionClosed: true }));
                        }
                        return;
                    }
                    const upstreamID = rule.upstreams[0];
                    const upstream = config.server.upstreams.find(e => e.id === upstreamID);
                    if (!upstreamID || !upstream) {
                        console.log(`[Worker ${process.pid}] Upstream not found for ${requrl}`);
                        const reply = {
                            errorcode: "500",
                            error: `Upstream not found`,
                        };
                        if (process.send) {
                            process.send(JSON.stringify(reply));
                            process.send(JSON.stringify({ connectionClosed: true }));
                        }
                        return;
                    }
                    // console.log(`[Worker ${process.pid}] Forwarding to upstream: ${upstream.url}${requrl}`);
                    const request = node_http_1.default.request({
                        host: upstream.url,
                        path: requrl,
                    }, (proxyRes) => {
                        let body = '';
                        proxyRes.on('data', (chunk) => {
                            body += chunk;
                        });
                        proxyRes.on('end', () => {
                            // console.log(`[Worker ${process.pid}] Received response from upstream for ${requrl}`);
                            const reply = {
                                data: body,
                                headers: { 'X-Worker-ID': `${process.pid}` }
                            };
                            if (process.send) {
                                process.send(JSON.stringify(reply));
                                process.send(JSON.stringify({ connectionClosed: true }));
                                console.log(`[Worker ${process.pid}] Connection closed for ${requrl}`);
                            }
                        });
                    });
                    request.on('error', (error) => {
                        console.error(`[Worker ${process.pid}] Error forwarding request: ${error.message}`);
                        const reply = {
                            errorcode: "502",
                            error: `Bad Gateway: ${error.message}`,
                        };
                        if (process.send) {
                            process.send(JSON.stringify(reply));
                            process.send(JSON.stringify({ connectionClosed: true }));
                        }
                    });
                    request.end();
                }
                catch (error) {
                    console.error(`[Worker ${process.pid}] Error processing message:`, error);
                    const reply = {
                        errorcode: "500",
                        error: `Internal Server Error`,
                    };
                    if (process.send) {
                        process.send(JSON.stringify(reply));
                        process.send(JSON.stringify({ connectionClosed: true }));
                    }
                }
            }));
        }
    });
}
