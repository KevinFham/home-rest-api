import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import type { Request, Response } from 'express';
import { promiseExec, parseConfig, getOpenApiSpec, isMachineUp } from '@/src/utils.js';

const cfg = parseConfig();

const { oApiSpec_GET, oApiSpec_PUT } = getOpenApiSpec(path.join(__dirname, '/api-doc.yml'));

const GET = async ( req: Request, res: Response ) => {
    const machineHostname = req.query['machineHostname'];
    if ( machineHostname === undefined ) { res.status(400).send('Missing \"?machineHostname=\" query'); return; }
    else {
        const isUp = await isMachineUp(cfg.mcServer.serverHostName);
        if ( isUp ) {
            res.status(200).send({ code: 0, message: "Machine is up" });
        } else {
            res.status(200).send({ code: 1, message: "Machine is down" });
        }
        return;
    }
}

const PUT = async ( req: Request, res: Response ) => {
    const machineHostname = req.query['machineHostname'];
    const payload = req.body;
    if ( payload === undefined ) { res.status(400).send('Bad Request'); return; }
    else if ( !( 'action' in payload ) ) { res.status(400).send('Bad Request'); return; }
    else if ( machineHostname === undefined ) { res.status(400).send('Missing \"?machineHostname=\" query'); return; }
    
    //Check if machineHostname is under a list of known hostnames

    else {
        if ( payload.action === 'startMachine' ) {                                      // Start Machine
            await promiseExec(`wakeonlan ${cfg.mcServer.serverMacAddr}`);
            res.status(200).send({ code: 0, message: "Starting Machine" });
        }
        else {                                                                          // Unknown Action
            res.status(400).send(`Unknown Action "${payload.action}"`);
        }

        return;
    }
}

export { GET, PUT, oApiSpec_GET, oApiSpec_PUT };
