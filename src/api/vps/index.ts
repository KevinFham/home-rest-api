import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import type { Request, Response } from 'express';
import { Mutex } from 'async-mutex';
import { promiseExec, parseConfig, getOpenApiSpec, isMachineUp } from '@/src/utils.js';

const cfg = parseConfig();

class VPSTimer {
    //private _doctlUp = this.setUpDoctl();   // Unused property; documented for future implementations
    private vpsUpTimer = 0;
    private vpsUpTimerMutex = new Mutex();
    private intervalID!: ReturnType<typeof setInterval> | undefined;

    public constructor() {
        // Sync occasionally in case of mismatched state
        setInterval(async () => {
            this.syncVps();
        }, cfg.vps.syncInterval * 1000);

        this.setUpDoctl();
    }

    public async setUpDoctl(): Promise<boolean> {
        return new Promise<boolean>(async function(resolve, _) {
            var { err } = await promiseExec(`doctl account get`);
            if (!err) { 
                console.log('Successfully authenticated doctl');
                resolve(true); 
            }
            else if (process.env['DIGITAL_OCEAN_API_TOKEN']) {
                var { err } = await promiseExec(`doctl auth init -t ${process.env['DIGITAL_OCEAN_API_TOKEN']}`);
                if (!err) { 
                    console.log('Successfully authenticated doctl');
                    resolve(true); 
                }
                else {
                    console.error('DIGITAL_OCEAN_API_TOKEN contains an invalid API token');
                    resolve(false);
                }
            }
            else {  
                console.error('Missing DIGITAL_OCEAN_API_TOKEN in .env');
                resolve(false);
            }
        });
    }

    public async syncVps(): Promise<void> {
        const isUp = await isMachineUp(cfg.vps.vpsHostname);
        if ( isUp && !this.intervalID ) {
            console.log('VPS found online! Syncing timeout timer...');
            this.enableVpsTimer();
        } else if( !isUp && this.intervalID ) {
            this.clearVpsTimer();
        } 
        // Else, it is either up and working, or down and not running
    }

    public async enableVpsTimer(): Promise<void> {
        this.vpsUpTimer = 0;
        setTimeout(() => {}, cfg.vps.startDelay * 1000);

        if (this.intervalID) { clearInterval(this.intervalID); }
        this.intervalID = setInterval(async () => {
            const release = await this.vpsUpTimerMutex.acquire();
            try {
                this.vpsUpTimer += 5;

                if (this.vpsUpTimer > cfg.vps.timeOut) {
                    console.log('VPS auto shutoff triggered');
                    const { err } = await promiseExec(`doctl compute droplet-action power-off ${cfg.vps.dropletID}`);
                    if ( !err ) {
                        console.log('VPS shutting off');
                    } else {
                        throw new Error('doctl failed to power off droplet');
                    }
                    clearInterval(this.intervalID);
                    this.intervalID = undefined;
                }
            } finally {
                release();
            }
        }, 5000);
    }

    public async refreshVpsTimer(): Promise<void> {
        const release = await this.vpsUpTimerMutex.acquire();
        try {
            this.vpsUpTimer = 0;
        } finally {
            release();
        }
    }

    public async clearVpsTimer(): Promise<void> {
        if (this.intervalID) {
            const release = await this.vpsUpTimerMutex.acquire();
            try {
                clearInterval(this.intervalID);
                this.intervalID = undefined;
                this.vpsUpTimer = 0;
            } finally {
                release();
            }
        }
    }
}

const vpsTimer = new VPSTimer();
vpsTimer.syncVps();


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
                    vpsTimer.enableVpsTimer();
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
                vpsTimer.clearVpsTimer();
            } else {
                res.status(200).send({ code: 1, message: "VPS is already down!" });   
            }
        }
        else if ( payload.action === 'refreshVps' ) {
            vpsTimer.refreshVpsTimer();
            res.status(200).send({ code: 0, message: "VPS refreshed." });
        }
        else if ( payload.action === 'syncVps' ) {
            vpsTimer.syncVps();
            res.status(200).send({ code: 0, message: "VPS synced." });
        }
        else {
            res.status(400).send(`Unknown Action "${payload.action}".`);
        }
        
        return;
    }
}

export { GET, PUT, oApiSpec_GET, oApiSpec_PUT};
