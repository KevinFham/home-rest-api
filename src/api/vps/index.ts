import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import type { Request, Response } from 'express';
import { promiseExec, parseConfig, getOpenApiSpec, isMachineUp } from '@/src/utils.js';
import { VPSController } from '@/src/api/vps/utils.js';

const cfg = parseConfig();

const vpsCtrl = new VPSController();
vpsCtrl.syncVps();


const { oApiSpec_GET, oApiSpec_PUT } = getOpenApiSpec(path.join(__dirname, '/api-doc.yml'));

const GET = async (_req: Request, res: Response) => {
    const isUp = await isMachineUp(cfg.vps.vpsHostname);
    if ( isUp ) {
        res.status(200).send({ code: 0, message: "VPS is up." });
    } else {
        res.status(200).send({ code: 1, message: "VPS is down." });
    }
    return;
}

const PUT = async (req: Request, res: Response) => {
    const payload = req.body;
    if( payload === undefined ) { res.status(400).send('Bad Request'); return; }
    else if ( !( 'action' in payload ) ) { res.status(400).send('Bad Request'); return; }
    else {
        if ( payload.action === 'startVps' ) {
            const isUp = await isMachineUp(cfg.vps.vpsHostname);
            if ( isUp ) {
                res.status(200).send({ code: 1, message: "VPS is already up!" });   
            } else {
                const { err } = await promiseExec(`doctl compute droplet-action power-on ${cfg.vps.dropletID}`);
                if ( !err ) {
                    vpsCtrl.enableVpsTimer();
                    res.status(200).send({ code: 0, message: "Starting up VPS!" });
                } else {
                    throw new Error('doctl failed to power on droplet');
                }
            }
        }
        else if ( payload.action === 'stopVps' ) {
            const isUp = await isMachineUp(cfg.vps.vpsHostname);
            if ( isUp ) {
                const { err } = await promiseExec(`doctl compute droplet-action power-off ${cfg.vps.dropletID}`);
                if ( !err ) {
                    res.status(200).send({ code: 0, message: "Shutting down VPS!" });
                } else {
                    throw new Error('doctl failed to power off droplet');
                }
                vpsCtrl.clearVpsTimer();
            } else {
                res.status(200).send({ code: 1, message: "VPS is already down!" });   
            }
        }
        else if ( payload.action === 'refreshVps' ) {
            vpsCtrl.refreshVpsTimer();
            res.status(200).send({ code: 0, message: "VPS refreshed." });
        }
        else if ( payload.action === 'syncVps' ) {
            vpsCtrl.syncVps();
            res.status(200).send({ code: 0, message: "VPS synced." });
        }
        else {
            res.status(400).send(`Unknown Action "${payload.action}".`);
        }
        
        return;
    }
}

export { GET, PUT, oApiSpec_GET, oApiSpec_PUT};
