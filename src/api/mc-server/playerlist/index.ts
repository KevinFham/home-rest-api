import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import type { Request, Response } from 'express';
import { parseConfig, getOpenApiSpec, isMachineUp } from '@/src/utils.js';
import { ServerStatus, ServerAliasDict, getMinecraftServerStatus, getMinecraftServerPlayers } from '@/src/api/mc-server/utils.js';

const cfg = parseConfig();

const { oApiSpec_GET } = getOpenApiSpec(path.join(__dirname, '/api-doc.yml'));

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
                res.status(200).send({ code: 0, message: JSON.stringify({
                    playerCount: currentlyOnline.length, 
                    players: currentlyOnline 
                }) });
            } else {
                res.status(200).send({ code: 1, message: "Minecraft server is shut down." });
            }
        } else {
            res.status(200).send({ code: 1, message: "Minecraft server is down because machine is down!" });
        }
        
        return;
    }
}

export { GET, oApiSpec_GET };
