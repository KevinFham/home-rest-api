import { DockerContext } from '@/src/contexts/docker-context.js';
import { parseConfig } from '@/src/utils.js';

const cfg = parseConfig();

export const McDockerContext = new DockerContext({ hostname: cfg.mcServer.serverHostName, tlsEnabled: true, tlsCertDir: cfg.mcServer.tlsCertDir });

export enum ServerStatus {
    STOPPED = "STOPPED",
    STARTING = "STARTING",
    ACTIVE = "ACTIVE",
    UNKNOWN = "UNKNOWN",
    ERROR = "ERROR",
};

/*
* Dictionary based on config.yml where each key follows this convention:
* - { 'mcServerAlias': 'mcServerContainerName' }
*/
export const ServerAliasDict = Object.assign({}, ...cfg.mcServer.mcServerAliases.map((key: string) => ({[key]: cfg.mcServer.mcServerContainerNames[cfg.mcServer.mcServerAliases.indexOf(key)]})));

export async function getMinecraftServerStatus(mcServerContainerName: string): Promise<ServerStatus> {
    const { stdout } = await McDockerContext.run(`docker container inspect -f '{{.State.Status}}, {{.State.Health}} exitcode{{.State.ExitCode}}' ${mcServerContainerName}`); 
    if ( stdout.includes("running") && stdout.includes("healthy") ) {
        return ServerStatus.ACTIVE;
    } else if ( stdout.includes("starting") ) {
        return ServerStatus.STARTING;
    } else if ( stdout.includes("exitcode137") || stdout.includes("exitcode0")) {
        return ServerStatus.STOPPED;
    } else if ( stdout.includes("exited") ) {
        return ServerStatus.ERROR;
    } else {
        return ServerStatus.UNKNOWN;
    }
}

export async function getMinecraftServerPlayers(mcServerContainerName: string): Promise<string[]> {
    return new Promise( async function(resolve, _) {
        var { stdout, stderr, err } = await McDockerContext.run(`docker exec ${mcServerContainerName} rcon-cli \"list\" | sed -e 's/\x1b\[[0-9;]*m//g' -e 's/^[0-9a-zA-Z ]*: '//g -e 's/ //g'`);
        if (err) {
            console.error(stderr);
            resolve([]); return;
        }

        resolve(stdout.trim().split(",").filter((x: string) => x));
    });
}
