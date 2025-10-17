import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import type { Request, Response } from 'express';
import { parseConfig, getOpenApiSpec } from '@/src/utils.js';
import { VPSController } from '@/src/api/vps/utils.js';

const cfg = parseConfig();

const vpsController = new VPSController(cfg.vps.dropletID);


const { oApiSpec_GET, oApiSpec_PUT } = getOpenApiSpec(path.join(__dirname, '/api-doc.yml'));

const GET = async (_req: Request, res: Response) => {
    const isUp = await vpsController.isVPSUp();
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
            const isUp = await vpsController.isVPSUp();
            if ( isUp ) {
                res.status(200).send({ code: 1, message: "VPS is already up!" });   
            } else {
                const success = await vpsController.vpsUp();
                if ( success ) {
                    vpsController.enableVpsTimer();
                    res.status(200).send({ code: 0, message: "Starting up VPS!" });
                } else {
                    throw new Error('doctl failed to power on droplet');
                }
            }
        }
        else if ( payload.action === 'stopVps' ) {
            const isUp = await vpsController.isVPSUp();
            if ( isUp ) {
                const success = await vpsController.vpsDown();
                if ( success ) {
                    res.status(200).send({ code: 0, message: "Shutting down VPS!" });
                } else {
                    throw new Error('doctl failed to power off droplet');
                }
                vpsController.clearVpsTimer();
            } else {
                res.status(200).send({ code: 1, message: "VPS is already down!" });   
            }
        }
        else if ( payload.action === 'refreshVps' ) {
            vpsController.refreshVpsTimer();
            res.status(200).send({ code: 0, message: "VPS refreshed." });
        }
        else if ( payload.action === 'syncVps' ) {
            vpsController.syncVps();
            res.status(200).send({ code: 0, message: "VPS synced." });
        }
        else {
            res.status(400).send(`Unknown Action "${payload.action}".`);
        }
        
        return;
    }
}

export { GET, PUT, oApiSpec_GET, oApiSpec_PUT};
