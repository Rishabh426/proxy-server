import cluster from "cluster";
import { ConfigSchemaType } from "./config-schema";
import http from "node:http";

interface CreateServerConfig {
    port: number,
    workerCount: number,
    config: ConfigSchemaType,
}

export async function createserver(config: CreateServerConfig) {
    const { workerCount } = config;
    if(cluster.isPrimary) {
        console.log("Master process is on");

        for(let i = 0; i < workerCount; i++) {
            cluster.fork({ config : JSON.stringify(config.config) }); 
            console.log(`Master process : Worker node spinned up ${i}`);
        }

        const server = http.createServer((req, res) => {
            
        })
    } 
    else {
        console.log(`Worker node`, JSON.stringify(process.env.config)); }
    const workers = new Array(workerCount);
}  