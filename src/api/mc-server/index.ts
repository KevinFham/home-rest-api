import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import type { Request, Response } from 'express';
import { promiseExec, parseConfig, getOpenApiSpec, isMachineUp } from '@/src/utils.js';

const cfg = parseConfig();

enum ServerStatus {
    STOPPED = "STOPPED",
    STARTING = "STARTING",
    ACTIVE = "ACTIVE",
    UNKNOWN = "UNKNOWN",
    ERROR = "ERROR",
};

const ServerAliasDict = Object.assign({}, ...cfg.mcServer.mcServerAliases.map((key: string) => ({[key]: cfg.mcServer.mcServerContainerNames[cfg.mcServer.mcServerAliases.indexOf(key)]})));

async function getMinecraftServerStatus(serverAddress: string, mcServerContainerName: string): Promise<ServerStatus> {
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

async function getMinecraftServerPlayers(serverAddress: string, mcServerContainerName: string): Promise<string[]> {
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


const { oApiSpec_GET, oApiSpec_PUT } = getOpenApiSpec(path.join(__dirname, '/api-doc.yml'));

const GET = async ( req: Request, res: Response ) => {
    const mcInstance = req.query['mcInstance'] as string | undefined;
    if ( mcInstance === undefined ) { res.status(400).send('Missing \"?mcInstance=\" query'); return; }
    else if ( !( mcInstance in ServerAliasDict ) ) { res.status(200).send({ code: 1, message: `${mcInstance} not recognized in server aliases`}); return; }
    else { 
        var isUp = await isMachineUp(cfg.mcServer.serverHostName);
        if ( isUp ) {
            const mcStatus = await getMinecraftServerStatus(cfg.mcServer.serverHostName, ServerAliasDict[mcInstance]);
            if ( mcStatus === ServerStatus.ACTIVE ) {
                const currentlyOnline = await getMinecraftServerPlayers(cfg.mcServer.serverHostName, ServerAliasDict[mcInstance]);
                res.status(200).send({ code: 0, serverStat: "running", players: currentlyOnline, message: "Minecraft server is up and running!" });
            } else if ( mcStatus === ServerStatus.STARTING ) {
                res.status(200).send({ code: 0, serverStat: "starting", players: [], message: "Minecraft server is starting!" });
            } else if ( mcStatus === ServerStatus.ERROR ){
                res.status(200).send({ code: 1, serverStat: "error", players: [], message: "Minecraft server has an error!" });
            } else if ( mcStatus === ServerStatus.STOPPED ) {
                res.status(200).send({ code: 0, serverStat: "exited", players: [], message: "Minecraft server is shut down!" });
            } else {
                res.status(200).send({ code: 1, serverStat: "unknown", players: [], message: "Minecraft server status unknown." });
            }
        } else {
            res.status(200).send({ code: 1, serverStat: "down", players: [], message: "Minecraft server is down because machine is down!" });
        }
        
        return;
    }
}

const PUT = async ( req: Request, res: Response ) => {
    const mcInstance = req.query['mcInstance'] as string | undefined;
    const payload = req.body;
    if( payload === undefined ) { res.status(400).send('Bad Request'); return; }
    else if ( !( 'action' in payload ) ) { res.status(400).send('Bad Request'); return; }
    else if ( mcInstance === undefined ) { res.status(400).send('Missing \"?mcInstance=\" query'); return; }
    else if ( !( mcInstance in ServerAliasDict ) ) { res.status(200).send({ code: 1, message: `${mcInstance} not recognized in server aliases`}); return; }
    else { 
        if ( payload.action === 'startMinecraftServer' ) {                         // Start Minecraft Server
            const isUp = await isMachineUp(cfg.mcServer.serverHostName);
            if ( isUp ) {
                const mcStatus = await getMinecraftServerStatus(cfg.mcServer.serverHostName, ServerAliasDict[mcInstance]);
                if ( mcStatus === ServerStatus.ACTIVE ) {
                    res.status(200).send({ code: 1, message: "Minecraft server is already up and running!" });
                } else if ( mcStatus === ServerStatus.STARTING ) {
                    res.status(200).send({ code: 1, message: "Minecraft server is already starting!" });
                } else if ( mcStatus === ServerStatus.STOPPED || mcStatus === ServerStatus.ERROR ) {
                    await promiseExec(`ssh -t root@${cfg.mcServer.serverHostName} "docker start ${ServerAliasDict[mcInstance]}"`); 
                    res.status(200).send({ code: 0, message: "Starting Minecraft server!" });
                } else {
                    res.status(200).send({ code: 1, message: "Minecraft server status unknown." });
                }

            } else {
                res.status(200).send({ code: 1, message: "Minecraft server is down because machine is down!" });
            }
        }
        else if ( payload.action === 'stopMinecraftServer' ) {                          // Stop Minecraft Server
            const isUp = await isMachineUp(cfg.mcServer.serverHostName);
            if ( isUp ) {
                const mcStatus = await getMinecraftServerStatus(cfg.mcServer.serverHostName, ServerAliasDict[mcInstance]);
                if ( mcStatus === ServerStatus.ACTIVE ) {
                    const currentlyOnline = await getMinecraftServerPlayers(cfg.mcServer.serverHostName, ServerAliasDict[mcInstance]);
                    if ( !( currentlyOnline.length > 0 ) ) {
                        await promiseExec(`ssh -t root@${cfg.mcServer.serverHostName} "docker exec ${ServerAliasDict[mcInstance]} rcon-cli \"stop\""`);
                        res.status(200).send({ code: 0, message: "Shutting down Minecraft server..." });
                    } else {
                        res.status(200).send({ code: 1, message: `${currentlyOnline.length} players online! Aborting shutdown.` });
                    }

                } else if ( mcStatus === ServerStatus.STARTING ) {
                    res.status(200).send({ code: 1, message: "Minecraft server is starting up. Please wait until server is fully up and running." });
                } else if ( mcStatus === ServerStatus.STOPPED || mcStatus === ServerStatus.ERROR ) {
                    res.status(200).send({ code: 1, message: "Minecraft server is already stopped!" });
                } else {
                    res.status(200).send({ code: 1, message: "Minecraft server status unknown." });
                }
            } else {
                res.status(200).send({ code: 1, message: "Minecraft server is already down because machine is down!" });
            }
        }
        else {                                                                          // Unknown Action
            res.status(400).send(`Unknown Action "${payload.action}"`);
        }

        return;
    }
}

//    else if ( payload.action === 'getMinecraftServerList' ) {
//        const isUp = await isMachineUp(cfg.mcServer.serverHostName);
//         if ( isUp ) {
//             res.status(200).send({ code: 0, message: JSON.stringify({
//                 mcServerAliases: cfg.mcServer.mcServerAliases,
//                 mcServerAddrs: cfg.mcServer.mcServerAddrs
//             }) });
//         } else {
//             res.status(200).send({ code: 1, message: "Machine is down. Unable to get server list" });
//         }
//    }

export { GET, PUT, oApiSpec_GET, oApiSpec_PUT };
