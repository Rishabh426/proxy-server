import { program } from 'commander'
import { parseYAMLConfig, validateConfig } from './config'
import cluster from 'node:cluster'
import { workerData } from 'node:worker_threads';
import os from 'node:os'
import http from 'node:http'

interface CreateServerConfig {
    port: number,
    workerCount: number,
}

async function createServer(config: CreateServerConfig) {
    const { workerCount } = config;
    if(cluster.isPrimary) {
        console.log("Master process is on 🚀");

        for(let i = 0; i < workerCount; i++) {
            cluster.fork(); 
            console.log(`Master process : Worker node spinned up ${i}`);
        }

        const server = http.createServer((req, res) => {})
    } 
    else {
        console.log(`Worker node 🚀`);
    }
    const workers = new Array(workerCount);
}   

async function main() {
    program.option('--config <path>');
    program.parse();

    const options = program.opts();
    if(options && 'config' in options) {
        const validatedConfig = await validateConfig(
            await parseYAMLConfig(options.config)
        );
        await createServer({port: validatedConfig.server.listen, workerCount: validatedConfig.server.workers ?? os.cpus().length});
        console.log(validatedConfig);
    }
}

main();