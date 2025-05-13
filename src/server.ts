import cluster, { Worker } from "node:cluster";
import { ConfigSchemaType } from "./config-schema";
import http from "node:http";
import { workerMessgageType, workerMessgageSchema } from "./server-schema";
import { rootConfigSchema } from "./config-schema";

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
            
        })
        server.listen(config.port, () => console.log(`reverse proxy on port ${config.port}`));
    } 
    else {
        console.log(`Worker node`); }
    const workers = new Array(workerCount);

    process.on('message', async (m: string) => {
        const messagevalidated = await workerMessgageSchema.parseAsync(JSON.parse(m));
        // console.log(`WORKER`, m);

        const requrl = messagevalidated.url;
        // const rule = config.server.rules.filter(e => e.path === requrl)

    })
}  