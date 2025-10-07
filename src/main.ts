import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { glob } from 'glob';
import type { Application, Request, Response } from 'express';
import express from 'express';
import openapi from '@wesleytodd/openapi'
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
            process.exit(1);
        }
    });
}


const server: Application = express();
const oapi = openapi({
    openapi: '3.0.0',
    info: {
        title: 'Home REST API Server',
        description: 'API documentation',
        version: '1.0.0',
    }});
server.use( express.json() );
server.use( express.urlencoded( { extended: true } ) );
server.use( oapi );
server.use( '/api-docs', oapi.swaggerui() );

// Import API source code from folder structure
const foldersPath = path.join(__dirname, 'api');
const apiRouteStack = [];
const apiFiles = await glob(`**/*${FILE_EXTENSION}`, { cwd: foldersPath, absolute: false });
for (const apiPath of apiFiles) {
    const api = await import(path.join(foldersPath, apiPath));  
    const parsedPath = path.parse(apiPath);
    if ('actionHandler' in api) {
        if ('oApiSpec' in api) {
            server.post(path.join('/api', parsedPath.dir), oapi.path(api.oApiSpec), ( req: Request, res: Response ) => { api.actionHandler( req, res ); });
            apiRouteStack.push(path.join('/api', parsedPath.dir));
        } else {  
            console.error(`Failed to get Open API Spec for ${path.join('/api', parsedPath.dir)}`);
        }
    }
}


console.log('Server Routes:');
server.router.stack.forEach((r) => { 
    if(r.name === 'handle') { console.log(`- ${r!.route!.path}`); } 
});

server.listen(process.env['SERVER_PORT'], () => { console.log(`Server listening on http://localhost:${process.env['SERVER_PORT']}`) });
