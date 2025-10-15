import * as path from 'path';
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
    private contextUp: boolean = false;
    private tlsEnabled: boolean;
    private hostname: string;
    private hostSocket: string;

    public async isContextUp() { return this.contextUp; }

    public constructor(args: { hostname?: string, port?: number, protocol?: string, tlsEnabled?: boolean }) {
        this.tlsEnabled = args.tlsEnabled ?? false;
        this.hostname   = args.hostname ?? 'localhost';
        const port      = args.port ?? 2376;
        const protocol  = args.protocol ?? 'tcp://';
        this.hostSocket = `${protocol}${this.hostname}:${port}`;
    }

    private async initContext(hostname: string, hostSocket: string, tlsEnabled: boolean, tlsCertDir: string = '/usr/local/ssl'): Promise<boolean> {
        this.contextUp = await new Promise<boolean>(async function(resolve, _) {
            // Check host connection
            if (!await isMachineUp(hostname)) {
                console.error(`Failed to connect to ${hostname}.`);
                resolve(false); return;
            }

            // Check docker socket
            if (tlsEnabled) {
                var { err } = await promiseExec(`docker -H ${hostSocket} --tlsverify \
                                                    --tlscacert=${path.join(tlsCertDir, 'ca-cert.pem')} \
                                                    --tlscert=${path.join(tlsCertDir, 'home-rest-api-cert.pem')} \
                                                    --tlskey=${path.join(tlsCertDir, 'home-rest-api-cert.key')} \
                                                    version`);
            } else {
                var { err } = await promiseExec(`docker -H ${hostSocket} version`);
            }
            if (err) {
                console.error(`Failed to connect to docker socket at ${hostSocket}: ${err}`);
                resolve(false); return;
            }

            // Attempt to create/update context
            if (tlsEnabled) {
                var { stderr, err } = await promiseExec(`docker context create \
                                      --docker="host=${hostSocket},ca=${path.join(tlsCertDir, 'ca-cert.pem')},cert=${path.join(tlsCertDir, 'home-rest-api-cert.pem')},key=${path.join(tlsCertDir, 'home-rest-api-cert.key')}" \
                                      ${hostname}`);
            } else {
                var { stderr, err } = await promiseExec(`docker context create --docker="host=${hostSocket}" ${hostname}`);
            }
            if (stderr.includes('already exists')) {
                if (tlsEnabled) {
                    var { err } = await promiseExec(`docker context update \
                                  --docker="host=${hostSocket},ca=${path.join(tlsCertDir, 'ca-cert.pem')},cert=${path.join(tlsCertDir, 'home-rest-api-cert.pem')},key=${path.join(tlsCertDir, 'home-rest-api-cert.key')}" \
                                  ${hostname}`);
                } else {
                    var { err } = await promiseExec(`docker context update --docker="host=${hostSocket}" ${hostname}`);
                }
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
        const cfg = parseConfig();
        if (this.contextUp || (!this.contextUp && await this.initContext(this.hostname, this.hostSocket, this.tlsEnabled, cfg.mcServer.tlsCertDir))) {
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
