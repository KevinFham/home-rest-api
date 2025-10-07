import type { ExecException } from 'child_process';
import { exec } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import YAML from 'yaml';

const promiseExec = async (command: string): Promise<{stdout: string, stderr: string, err: ExecException | null}> => {
    return new Promise(( resolve, _ ) => {
        exec(command, (err, stdout, stderr) => {
            resolve({ stdout, stderr, err });
        });
    });
}

const parseConfig = () => {
    if (!existsSync('./config.yml')) {
        console.error('No config.yml file found!');
        process.exit(0);
    }

    const file = readFileSync('./config.yml', 'utf8');
    let configData = YAML.parse(file);

    return configData;
}

const getOpenApiSpec = (apiDocPath: string) => {
    if (!existsSync(apiDocPath)) {
        console.error(`No ${apiDocPath} file found!`);
        return { responses: { 501: { description: "API Spec not implemented" } }};
    } else {
        return YAML.parse(readFileSync(apiDocPath, 'utf8'));
    }
}


const isMachineUp = async (serverAddress: string, timeoutms: number = 600): Promise<boolean> => {
    return new Promise( async function(resolve, _) {
        const { err } = await promiseExec(`fping -c1 -t${timeoutms} ${serverAddress}`);
        if (err) { resolve(false); }
        else { resolve(true); }
    });
}

export { promiseExec, parseConfig, getOpenApiSpec, isMachineUp };
