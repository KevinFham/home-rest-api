import { promiseExec, parseConfig } from '@/src/utils.js';

const cfg = parseConfig();

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

export async function getMinecraftServerStatus(serverAddress: string, mcServerContainerName: string): Promise<ServerStatus> {
    const { stdout } = await promiseExec(`ssh -t root@${serverAddress} "docker container inspect -f '{{.State.Status}}, {{.State.Health}} exitcode{{.State.ExitCode}}' ${mcServerContainerName}"`);
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

export async function getMinecraftServerPlayers(serverAddress: string, mcServerContainerName: string): Promise<string[]> {
    return new Promise( async function(resolve, reject) {
        try {
            var { stdout } = await promiseExec(`ssh -t root@${serverAddress} "docker exec ${mcServerContainerName} rcon-cli \"list\" | sed -e 's/\x1b\[[0-9;]*m//g' -e 's/^[0-9a-zA-Z ]*: '//g -e 's/ //g'"`);
            resolve(stdout.trim().split(",").filter((x: string) => x));
        } catch (err) {
            console.log(err);
            reject(err);
        }
    });
}
