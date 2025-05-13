import { program } from 'commander'
import { parseYAMLConfig, validateConfig } from './config'
import { rootConfigSchema } from './config-schema';
import os from "node:os"
import { createserver } from './server';

async function main() {
    program.option('--config <path>');
    program.parse();

    const options = program.opts();
    if(options && 'config' in options) {
        const validatedConfig = await validateConfig(
            await parseYAMLConfig(options.config)
        );
        await createserver(
            {
                port: validatedConfig.server.listen, 
                workerCount: validatedConfig.server.workers ?? os.cpus().length,
                config: validatedConfig,
            });
        // console.log(validatedConfig);
    }
}

main();

function createServer(arg0: { port: number; workerCount: number; config: { server: { listen: number; upstreams: { id: string; url: string; }[]; rules: { upstreams: string[]; path: string; }[]; workers?: number | undefined; headers?: { value: string; key: string; }[] | undefined; }; }; }) {
    throw new Error('Function not implemented.');
}
