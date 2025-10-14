import { Mutex } from 'async-mutex';
import { promiseExec, parseConfig, isMachineUp } from '@/src/utils.js';

const cfg = parseConfig();

export class VPSController {
    private doctlUp = false;
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
        this.doctlUp = await new Promise<boolean>(async function(resolve, _) {  
            var { err } = await promiseExec(`doctl account get`);
            if (err) { 
                if (process.env['DIGITAL_OCEAN_API_TOKEN']) {
                    var { err } = await promiseExec(`doctl auth init -t ${process.env['DIGITAL_OCEAN_API_TOKEN']}`);
                    if (err) { 
                        console.error('DIGITAL_OCEAN_API_TOKEN contains an invalid API token');
                        resolve(false); return;
                    }
                }
                console.error('Missing DIGITAL_OCEAN_API_TOKEN in .env');
                resolve(false); return;
            }
                
            console.log('Successfully authenticated doctl');
            resolve(true); return;
        });
        return this.doctlUp;
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
                    if (err) {
                        console.error('doctl failed to power off droplet');
                    } else {
                        console.log('VPS shutting off');
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
