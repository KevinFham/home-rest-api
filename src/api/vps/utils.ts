import { Mutex } from 'async-mutex';
import { parseConfig, isMachineUp } from '@/src/utils.js';
import { DoctlContext } from '@/src/contexts/doctl-context.js';

const cfg = parseConfig();

export class VPSController {
    private doctlContext: DoctlContext;
    private dropletID: number;
    private dropletPublicIpv4: string | undefined;
    private vpsUpTimer: number = 0;
    private vpsUpTimerMutex: Mutex = new Mutex();
    private intervalID!: ReturnType<typeof setInterval> | undefined;


    public constructor(dropletID: number) {
        this.dropletID = dropletID;

        if (!process.env['DIGITAL_OCEAN_API_TOKEN']) {
            throw new Error('Missing DIGITAL_OCEAN_API_TOKEN in .env');
        } else {
            this.doctlContext = new DoctlContext(process.env['DIGITAL_OCEAN_API_TOKEN']);
            this.dropletPublicIpv4 = '';
            this.isVPSUp();                   // Get everything set up and running

            // Sync occasionally in case of mismatched state
            setInterval(async () => {
                this.syncVps();
            }, cfg.vps.syncInterval * 1000);
        }
    }

    public async isVPSUp(): Promise<boolean> {
        if (!this.doctlContext) {
            console.error('Cannot grab doctl context');
            return Promise.reject(new Error('Cannot grab doctl context'));
        }
        
        if (this.dropletPublicIpv4 && this.dropletPublicIpv4.length > 0) {
            return isMachineUp(this.dropletPublicIpv4);
        } else {
            const { stdout, err } = await this.doctlContext.run(`doctl compute droplet list | grep '${this.dropletID}' | awk '{print $3}'`);
            if (err) {
                console.error(`Cannot get ip address of droplet id ${this.dropletID}`);
                return Promise.reject(new Error(`Cannot get ip address of droplet id ${this.dropletID}`));
            }
            this.dropletPublicIpv4 = stdout;
            return isMachineUp(this.dropletPublicIpv4);
        }
    }

    public async vpsUp(): Promise<boolean> {
        const { err } = await this.doctlContext.run(`doctl compute droplet-action power-on ${this.dropletID}`);
        if (err) {
            throw new Error('Failed to start VPS!');
            return false;
        }
        return true;
    }

    public async vpsDown(): Promise<boolean> {
        const { err } = await this.doctlContext.run(`doctl compute droplet-action power-off ${this.dropletID}`);
        if (err) {
            throw new Error('Failed to stop VPS!');
            return false;
        }
        return true;
    }

    public async syncVps(): Promise<void> {
        const isUp = await this.isVPSUp();
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
                    const { err } = await this.doctlContext.run(`doctl compute droplet-action power-off ${this.dropletID}`);
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
