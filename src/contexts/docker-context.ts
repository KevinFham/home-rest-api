import * as path from 'path';
import type { ExecException } from 'child_process';
import { promiseExec, isMachineUp } from '@/src/utils.js';

export class DockerContext {
    private contextUp: boolean = false;
    private tlsEnabled: boolean;
    private tlsCertDir: string;
    private hostname: string;
    private hostSocket: string;

    public async isContextUp() { return this.contextUp; }

    public constructor(args: { hostname?: string, port?: number, protocol?: string, tlsEnabled?: boolean, tlsCertDir?: string}) {
        this.tlsEnabled = args.tlsEnabled ?? false;
        this.tlsCertDir = args.tlsCertDir ?? '/usr/local/ssl';
        if (!path.isAbsolute(this.tlsCertDir)) {
            this.tlsCertDir = path.join(globalThis.projectDir, this.tlsCertDir);
        }
        this.hostname   = args.hostname ?? 'localhost';
        const port      = args.port ?? 2376;
        const protocol  = args.protocol ?? 'tcp://';
        this.hostSocket = `${protocol}${this.hostname}:${port}`;
    }

    private async initContext(hostname: string, hostSocket: string, tlsEnabled: boolean, tlsCertDir: string): Promise<boolean> {
        this.contextUp = await new Promise<boolean>(async function(resolve, _) {
            // Check host connection
            if (!await isMachineUp(hostname)) {
                console.error(`Failed to connect to ${hostname} for docker context.`);
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
                    console.error(`Failed to update docker context for ${hostname}: ${err}`)
                    resolve(false); return;
                }
                console.log(`Successfully started docker context for ${hostname}!`);
                resolve(true); return;
            }  else if (err) {
                console.error(`Failed to create docker context for ${hostname}: ${err}`)
                resolve(false); return;
            }

            console.log(`Successfully started docker context for ${hostname}!`);
            resolve(true); return;
            
        });
        return this.contextUp;
    }

    public async run(cmd: string): Promise<{stdout: string, stderr: string, err: ExecException | null}> {
        if (this.contextUp || (!this.contextUp && await this.initContext(this.hostname, this.hostSocket, this.tlsEnabled, this.tlsCertDir))) {
            await promiseExec(`docker context use ${this.hostname}`);
            return promiseExec(cmd);
        } 
        else {
            return {
                stdout: '',
                stderr: `Error: Failed to initialize docker context for ${this.hostname}.`,
                err: Error(`Failed to initialize docker context for ${this.hostname}.`)
            }
        }
    }
}
