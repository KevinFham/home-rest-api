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

export { promiseExec, parseConfig };
