import type { ExecException } from 'child_process';
import { exec } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import YAML from 'yaml';

const promiseExec = async (command: string): Promise<{stdout: string, stderr: string, err: ExecException | null}> => {
    return new Promise(( resolve, _ ) => {
        exec(command, (err, stdout, stderr) => {
            resolve({ stdout, stderr, err });
        });
    });
}

const parseConfig = (configPath: string = './config.yml') => {
    if (!existsSync(configPath)) {
        console.error(`No ${configPath} file found!`);
        process.exit(0);
    }

    const file = readFileSync(configPath, 'utf8');
    let configData = YAML.parse(file);

    return configData;
}

const getOpenApiSpec = (apiDocPath: string) => {
    if (!existsSync(apiDocPath)) {
        console.error(`No ${apiDocPath} file found!`);
        return { responses: { 501: { description: "API Spec not implemented" } }};
    } else {
        const oApiSpec = YAML.parse(readFileSync(apiDocPath, 'utf8'));
        const oApiSpec_GET = ('GET' in oApiSpec) ? oApiSpec.GET : false;
        const oApiSpec_POST = ('POST' in oApiSpec) ? oApiSpec.POST : false;
        const oApiSpec_PUT = ('PUT' in oApiSpec) ? oApiSpec.PUT : false;
        const oApiSpec_DELETE = ('DELETE' in oApiSpec) ? oApiSpec.DELETE : false;

        return { oApiSpec, oApiSpec_GET, oApiSpec_POST, oApiSpec_PUT, oApiSpec_DELETE };
    }
}


const isMachineUp = async (serverAddress: string, timeoutms: number = 600): Promise<boolean> => {
    return new Promise( async function(resolve, _) {
        const { err } = await promiseExec(`fping -c1 -t${timeoutms} ${serverAddress}`);
        if (err) { resolve(false); }
        else { resolve(true); }
    });
}

class DockerContext {
    private contextUp = false;
    private hostname;
    private protocol;
    private port;

    public async isContextUp() { return this.contextUp; }

    public constructor(hostname: string, port: number = 2376, protocol: string = 'tcp://') {
        this.hostname = hostname;
        this.protocol = protocol;
        this.port = port;
    }

    private async initContext(hostname: string, port: number, protocol: string): Promise<boolean> {
        this.contextUp = await new Promise<boolean>(async function(resolve, _) {
            // Check host connection
            if (!await isMachineUp(hostname)) {
                console.error(`Failed to connect to ${hostname}.`);
                resolve(false); return;
            }

            // Check docker socket
            var { err } = await promiseExec(`docker -H ${protocol}${hostname}:${port} version`);
            if (err) {
                console.error(`Failed to connect to docker socket at ${protocol}${hostname}:${port}: ${err}`);
                resolve(false); return;
            }

            // Attempt to create/update context
            var { stderr, err } = await promiseExec(`docker context create --docker="host=${protocol}${hostname}:${port}" ${hostname}`);
            if (stderr.includes('already exists')) {
                var { err } = await promiseExec(`docker context update --docker="host=${protocol}${hostname}:${port}" ${hostname}`);
                if (err) {
                    console.error(`Failed to update context for ${hostname}: ${err}`)
                    resolve(false); return;
                }
                console.log(`Successfully started context for ${hostname}!`);
                resolve(true); return;
            }  else if (err) {
                console.error(`Failed to create context for ${hostname}: ${err}`)
                resolve(false); return;
            }

            console.log(`Successfully started context for ${hostname}!`);
            resolve(true); return;
            
        });
        return this.contextUp;
    }

    public async run(cmd: string): Promise<{stdout: string, stderr: string, err: ExecException | null}> {
        if (this.contextUp || (!this.contextUp && await this.initContext(this.hostname, this.port, this.protocol))) {
            await promiseExec(`docker context use ${this.hostname}`);
            return promiseExec(cmd);
        } 
        else {
            return {
                stdout: '',
                stderr: 'Error: Failed to initialize context.',
                err: Error('Failed to initialize context.')
            }
        }
    }
}

export { DockerContext, promiseExec, parseConfig, getOpenApiSpec, isMachineUp };
