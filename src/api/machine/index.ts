import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import type { Request, Response } from 'express';
import { promiseExec, parseConfig, getOpenApiSpec, isMachineUp } from '@/src/utils.js';

const cfg = parseConfig();

/*
* Dictionary based on config.yml where each key follows this convention:
* - { 'machineHostname': 'machineMacAddr' }
*/
const MachineAddrDict = Object.assign({}, ...cfg.machines.machineHostnames.map((key: string) => ({[key]: cfg.machines.machineMacAddrs[cfg.machines.machineHostnames.indexOf(key)]})));

const { oApiSpec_GET, oApiSpec_PUT } = getOpenApiSpec(path.join(__dirname, '/api-doc.yml'));

const GET = async ( req: Request, res: Response ) => {
    const machineHostname = req.query['machineHostname'] as string | undefined;
    if ( machineHostname === undefined ) { res.status(400).send('Missing \"?machineHostname=\" query'); return; }
    else if ( !(machineHostname in MachineAddrDict) ) { res.status(200).send({ code: 1, message: `Hostname "${machineHostname}" not registered`}); return;  }
    else {
        const isUp = await isMachineUp(machineHostname);
        if ( isUp ) {
            res.status(200).send({ code: 0, message: "Machine is up" });
        } else {
            res.status(200).send({ code: 1, message: "Machine is down" });
        }
        return;
    }
}

const PUT = async ( req: Request, res: Response ) => {
    const machineHostname = req.query['machineHostname'] as string | undefined;
    const payload = req.body;
    if ( payload === undefined ) { res.status(400).send('Bad Request'); return; }
    else if ( !( 'action' in payload ) ) { res.status(400).send('Bad Request'); return; }
    else if ( machineHostname === undefined ) { res.status(400).send('Missing \"?machineHostname=\" query'); return; }
    else if ( !(machineHostname in MachineAddrDict) ) { res.status(200).send({ code: 1, message: `"${machineHostname}" is not a registered hostname`}); return;  }
    else {
        if ( payload.action === 'startMachine' ) {
            await promiseExec(`wakeonlan ${MachineAddrDict[machineHostname]}`);
            res.status(200).send({ code: 0, message: "Starting Machine" });
        }
        else {
            res.status(400).send(`Unknown Action "${payload.action}"`);
        }

        return;
    }
}

export { GET, PUT, oApiSpec_GET, oApiSpec_PUT };
