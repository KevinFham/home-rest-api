import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import type { Application, Request, Response } from 'express';
import express from 'express';
import { parseConfig } from '@/src/utils.js';

const FILE_EXTENSION = (process.env['NODE_ENV'] == 'development') ? '.ts' : '.js';
const cfg = parseConfig();

// Ensure Required Binaries are installed
const requiredBin = [
    'fping',
    'wakeonlan',
]
if ('dropletID' in cfg.vps) { requiredBin.push('doctl'); }

if (process.env['PATH']) {
    const pathDirs = process.env['PATH'].split(':');
    var binFound = false;
    requiredBin.forEach((bin: string) => {
        binFound = false;
        for (const dir of pathDirs) {
            try {
                const res = fs.statSync(path.join(dir, bin));
                if (res) { binFound = true; }
            } catch (e) { continue; }
        }
        if (!binFound) {
            console.error(`Required executable "${bin}" not found in $PATH!`);
            process.exit(1)
        }
    });
}


const server: Application = express();
server.use( express.json() );
server.use( express.urlencoded( { extended: true } ) );

// Import API source code from folder structure
const foldersPath = path.join(__dirname, 'api');
const apiFolders = fs.readdirSync(foldersPath);
const apiRouteStack = [];
for (const folder of apiFolders) {
    const apiPath = path.join(foldersPath, folder);
    const apiFiles = fs.readdirSync(apiPath).filter(file => file.endsWith(FILE_EXTENSION));
    for (const file of apiFiles) {
        const filePath = path.join(apiPath, file);
        const api = await import(filePath);
        if ('actionHandler' in api) {
            server.post(path.join('/api', folder), ( req: Request, res: Response ) => { api.actionHandler( req, res ); });
            apiRouteStack.push(path.join('/api', folder));
        }
    }
}

console.log('Server Routes:');
server.router.stack.forEach((r) => { 
    if(r.name === 'handle') { console.log(`- ${r!.route!.path}`); } 
});

server.listen(process.env['SERVER_PORT'], () => { console.log(`Server listening on http://localhost:${process.env['SERVER_PORT']}`) });
