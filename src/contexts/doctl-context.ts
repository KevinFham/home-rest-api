import type { ExecException } from 'child_process';
import { promiseExec } from '@/src/utils.js';


/*
 * IMPORTANT NOTE:  Due to a limitation of the doctl Command Line Interface, where you cannot provide a token and name the context for that token
 *                  in the same line without STDIN shenanigans, only one context is allowed to be registered at a time.
 */

export class DoctlContext {
    private contextUp: boolean = false;
    private apiToken: string;

    public async isContextUp() { return this.contextUp; }

    public constructor(apiToken: string) {
        this.apiToken = apiToken;
    }

    private async initContext(apiToken: string): Promise<boolean> {
        this.contextUp = await new Promise<boolean>(async function(resolve, _) {
            var { err } = await promiseExec(`doctl auth init -t ${apiToken}`);
            if (err) {
                console.error(`Invalid Digital Ocean API Token: ${err}`)
                resolve(false); return;
            }

            console.log(`Successfully started doctl context!`);
            resolve(true); return;
            
        });
        return this.contextUp;
    }

    public async run(cmd: string): Promise<{stdout: string, stderr: string, err: ExecException | null}> {
        if (this.contextUp || (!this.contextUp && await this.initContext(this.apiToken))) {
            return promiseExec(cmd);
        } 
        else {
            return {
                stdout: '',
                stderr: 'Error: Failed to initialize doctl context.',
                err: Error('Failed to initialize doctl context.')
            }
        }
    }
}
