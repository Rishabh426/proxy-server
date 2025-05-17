import cluster, { Worker } from "node:cluster";
import { ConfigSchemaType } from "./config-schema";
import http, { request } from "node:http";
import { workerMessgageType, workerMessgageSchema, workerMessgageReplyType } from "./server-schema";
import { workerMessgageReplySchema } from "./server-schema";
import { URL } from "url";
import { preprocess } from "zod";

interface CreateServerConfig {
    port: number,
    workerCount: number,
    config: ConfigSchemaType,
}

export async function createserver(config: CreateServerConfig) {

    const WORKER_POOL: Worker[] = [];

    const { workerCount } = config;
    if(cluster.isPrimary) {
        console.log("Master process is on");

        for(let i = 0; i < workerCount; i++) {
            const w = cluster.fork({ config : JSON.stringify(config.config) }); 
            WORKER_POOL.push(w);
            console.log(`Master process : Worker node spinned up ${i}`);
        }

        const server = http.createServer((req, res) => {
            const index = Math.floor(Math.random() * WORKER_POOL.length);
            const worker = WORKER_POOL.at(index);

            if(!worker) throw new Error(`Worker not found`);

            const payload: workerMessgageType = {
                requesttype: 'HTTP',
                headers: req.headers,
                body: null,
                url: `${req.url}`,
            }

            worker.send(JSON.stringify(payload));

            worker.on('message', async (workerreply: string) => {
                const reply = await workerMessgageReplySchema.parseAsync(JSON.parse(workerreply))
                if(reply.errorcode) {
                    res.writeHead(parseInt(reply.errorcode));
                    res.end(reply.error);
                    return;
                } else {
                    res.writeHead(200);
                    res.end(reply.data);
                    return;
                }
            })
            
        })
        server.listen(config.port, () => console.log(`reverse proxy on port ${config.port}`));
    } 
    else {
        console.log(`Worker node`);
        const config = JSON.parse(`${process.env.config}`) as ConfigSchemaType;
        
        process.on('message', async (m: string) => {
            const messagevalidated = await workerMessgageSchema.parseAsync(JSON.parse(m));
            // console.log(`WORKER`, m);

            const requrl = messagevalidated.url;
            const rule = config.server.rules.find(e => e.path === requrl);

            if(!rule) {
                const reply: workerMessgageReplyType = {
                    errorcode: "404",
                    error: `Rule not found`,
                }
                if(process.send) return process.send(JSON.stringify(reply));
            }
            const upstreamID = rule?.upstreams[0];
            const upstream = config.server.upstreams.find(e => e.id === upstreamID)

            if(!upstreamID) {
                const reply: workerMessgageReplyType = {
                    errorcode: "500",
                    error: `Upstream not found`,
                }
                if(process.send) return process.send(JSON.stringify(reply));
            }

            const request = http.request({
                host: upstream?.url,
                path: requrl,
            }, (proxyRes) => {

                let body = '';
                proxyRes.on('data', (chunk) => {
                    body += chunk;
                });

                proxyRes.on('end', () => {
                    const reply: workerMessgageReplyType = {
                        data: body,
                    }
                    if(process.send) return process.send(JSON.stringify(reply));
                })
            })
            request.end();
        });

    }
}
