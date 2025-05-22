import cluster, { Worker } from "node:cluster";
import { ConfigSchemaType } from "./config-schema";
import http from "node:http";
import { workerMessgageType, workerMessgageSchema, workerMessgageReplyType } from "./server-schema";
import { workerMessgageReplySchema } from "./server-schema";
import { LoadBalancer, LoadBalancingAlgorithm } from "./load-balancer";

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
            console.log(`Master process : Worker node spinned up ${i} (PID: ${w.process.pid})`);
        }

        const algorithm: LoadBalancingAlgorithm = 'round-robin';
        const balancer = new LoadBalancer({
            algorithm,
            workers: WORKER_POOL,
        });

        const server = http.createServer((req, res) => {
            const clientIp = req.socket.remoteAddress || '127.0.0.1';
            const worker = balancer.getNextWorker(clientIp);

            if(!worker) throw new Error(`Worker not found`);

            console.log(`[Master] Request ${req.url} routed to Worker PID: ${worker.process.pid}`);

            const payload: workerMessgageType = {
                requesttype: 'HTTP',
                headers: req.headers,
                body: null,
                url: `${req.url}`,
            }

            worker.send(JSON.stringify(payload));

            worker.once('message', async (workerreply: string) => {
                try {
                    const parsed = JSON.parse(workerreply);
                    
                    if (parsed.connectionClosed === true) {
                        console.log(`[Master] Connection closed on Worker PID: ${worker.process.pid}`);
                        return;
                    }
                    
                    const reply = await workerMessgageReplySchema.parseAsync(parsed);
                    
                    if(reply.errorcode) {
                        console.log(`[Master] Error response from Worker PID: ${worker.process.pid}, Code: ${reply.errorcode}`);
                        res.writeHead(parseInt(reply.errorcode));
                        res.end(reply.error);
                    } else {
                        console.log(`[Master] Success response from Worker PID: ${worker.process.pid}`);
                        res.writeHead(200, { 'X-Worker-ID': `${worker.process.pid}` });
                        res.end(reply.data);
                    }
                } catch (error) {
                    console.error('[Master] Error processing worker reply:', error);
                    res.writeHead(500);
                    res.end('Internal Server Error');
                }
            });
        });
        
        server.listen(config.port, () => console.log(`[Master] Reverse proxy listening on port ${config.port}`));
    } 
    else {
        console.log(`[Worker ${process.pid}] Started`);
        const config = JSON.parse(`${process.env.config}`) as ConfigSchemaType;
        
        process.on('message', async (m: string) => {
            try {
                const messagevalidated = await workerMessgageSchema.parseAsync(JSON.parse(m));
                
                const requrl = messagevalidated.url;
                const userAgent = messagevalidated.headers['user-agent'];
                const clientIp = messagevalidated.headers['x-forwarded-for'] || 'unknown';

                if (clientIp === '123.45.67.89') { 
                    console.log(`[Worker ${process.pid}] Headers for user ${clientIp}:`, messagevalidated.headers);
                }

                const rule = config.server.rules.find(e => {
                    const pathPattern = new RegExp(`^${e.path}(\\/.*)?$`);
                    return pathPattern.test(requrl);
                });

                if (!rule) {
                    console.log(`[Worker ${process.pid}] Rule not found for ${requrl}`);
                    const reply: workerMessgageReplyType = {
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

                if(!upstreamID || !upstream) {
                    console.log(`[Worker ${process.pid}] Upstream not found for ${requrl}`);
                    const reply: workerMessgageReplyType = {
                        errorcode: "500",
                        error: `Upstream not found`,
                    }
                    if(process.send) {
                        process.send(JSON.stringify(reply));
                        process.send(JSON.stringify({ connectionClosed: true }));
                    }
                    return;
                }

                // console.log(`[Worker ${process.pid}] Forwarding to upstream: ${upstream.url}${requrl}`);
                
                const request = http.request({
                    host: upstream.url,
                    path: requrl,
                }, (proxyRes) => {
                    let body = '';
                    proxyRes.on('data', (chunk) => {
                        body += chunk;
                    });

                    proxyRes.on('end', () => {
                        // console.log(`[Worker ${process.pid}] Received response from upstream for ${requrl}`);
                        
                        const reply: workerMessgageReplyType = {
                            data: body,
                            headers: { 'X-Worker-ID': `${process.pid}` }
                        }
                        
                        if(process.send) {
                            process.send(JSON.stringify(reply));
                            
                            process.send(JSON.stringify({ connectionClosed: true }));
                            console.log(`[Worker ${process.pid}] Connection closed for ${requrl}`);
                        }
                    });
                });
                
                request.on('error', (error) => {
                    console.error(`[Worker ${process.pid}] Error forwarding request: ${error.message}`);
                    const reply: workerMessgageReplyType = {
                        errorcode: "502",
                        error: `Bad Gateway: ${error.message}`,
                    }
                    if(process.send) {
                        process.send(JSON.stringify(reply));
                        process.send(JSON.stringify({ connectionClosed: true }));
                    }
                });
                
                request.end();
            } catch (error) {
                console.error(`[Worker ${process.pid}] Error processing message:`, error);
                const reply: workerMessgageReplyType = {
                    errorcode: "500",
                    error: `Internal Server Error`,
                }
                if(process.send) {
                    process.send(JSON.stringify(reply));
                    process.send(JSON.stringify({ connectionClosed: true }));
                }
            }
        });
    }
}