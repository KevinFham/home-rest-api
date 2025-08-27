import 'dotenv/config';
import type { Request, Response } from 'express';
import { Mutex } from 'async-mutex';
import { promiseExec, parseConfig, isMachineUp } from '@/src/utils.js';

const cfg = parseConfig();

class VPSTimer {
    private vpsUpTimer = 0;
    private vpsUpTimerMutex = new Mutex();
    private intervalID!: ReturnType<typeof setInterval> | undefined;

    public async syncVps(): Promise<void> {
        const isUp = await isMachineUp(cfg.vps.vpsHostname);
        if ( isUp && !this.intervalID ) {
            console.log('VPS found online! Syncing timeout timer...');
            this.enableVpsTimer();
        } else if( !isUp && this.intervalID ) {
            this.clearVpsTimer();
        }
    }

    public async enableVpsTimer(): Promise<void> {
        this.vpsUpTimer = 0;
        setTimeout(() => {}, cfg.vps.startDelay * 1000);
        
        this.intervalID = setInterval(async () => {
            const release = await this.vpsUpTimerMutex.acquire();
            try {
                this.vpsUpTimer += 1;
                await this.syncVps();

                if (this.vpsUpTimer > cfg.vps.timeOut) {
                    const { err } = await promiseExec(`doctl compute droplet-action power-off ${cfg.vps.dropletID}`);
                    if ( !err ) {
                        console.log('VPS auto shutoff triggered');
                    } else {
                        throw new Error('doctl failed to power off droplet');
                    }
                    clearInterval(this.intervalID);
                    this.intervalID = undefined;
                }
            } finally {
                release();
            }
        }, 1000);
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


const actionHandler = async (req: Request, res: Response) => {
    const payload = req.body;
    if( payload === undefined ) { res.status(400).send('Bad Request'); }
    else if ( !( 'action' in payload ) ) { res.status(400).send('Bad Request'); }

    else if ( payload.action === 'startVps' ) {
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
    else if ( payload.action === 'getVpsStatus' ){
        const isUp = await isMachineUp(cfg.vps.vpsHostname);
        if ( isUp ) {
            res.status(200).send({ code: 0, message: "VPS is up" });
        } else {
            res.status(200).send({ code: 1, message: "VPS is down" });
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
        res.status(200).send({ code: 0, message: "VPS refreshed" });
    }
    else {
        res.status(400).send(`Unknown Action "${payload.action}"`);
    }

}

export { actionHandler, vpsTimer };
