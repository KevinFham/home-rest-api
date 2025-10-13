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
    'doctl',
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
        }
    });
}


const server: Application = express();
const oapi = openapi({
    openapi: '3.0.0',
    info: {
        title: 'Home REST API Server',
        description: 'API documentation for [https://github.com/KevinFham/home-rest-api](https://github.com/KevinFham/home-rest-api)',
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
    if ('GET' in api) {
        if ('oApiSpec_GET' in api) {
            server.get(path.join('/api', parsedPath.dir), oapi.path(api.oApiSpec_GET), ( req: Request, res: Response ) => { api.GET( req, res ); });
            apiRouteStack.push(`${path.join('/api', parsedPath.dir)} (GET)`);
        } else {
            console.error(`Failed to get Open API Spec for ${path.join('/api', parsedPath.dir)} (GET)`);
        }
    }
    if ('POST' in api) {
        if ('oApiSpec_POST' in api) {
            server.post(path.join('/api', parsedPath.dir), oapi.path(api.oApiSpec_POST), ( req: Request, res: Response ) => { api.POST( req, res ); });
            apiRouteStack.push(`${path.join('/api', parsedPath.dir)} (POST)`);
        } else {  
            console.error(`Failed to get Open API Spec for ${path.join('/api', parsedPath.dir)} (POST)`);
        }
    }
    if ('PUT' in api) {
        if ('oApiSpec_PUT' in api) {
            server.put(path.join('/api', parsedPath.dir), oapi.path(api.oApiSpec_PUT), ( req: Request, res: Response ) => { api.PUT( req, res ); });
            apiRouteStack.push(`${path.join('/api', parsedPath.dir)} (PUT)`);
        } else {  
            console.error(`Failed to get Open API Spec for ${path.join('/api', parsedPath.dir)} (PUT)`);
        }
    }
    if ('DELETE' in api) {
        if ('oApiSpec_DELETE' in api) {
            server.delete(path.join('/api', parsedPath.dir), oapi.path(api.oApiSpec_DELETE), ( req: Request, res: Response ) => { api.DELETE( req, res ); });
            apiRouteStack.push(`${path.join('/api', parsedPath.dir)} (DELETE)`);
        } else {  
            console.error(`Failed to get Open API Spec for ${path.join('/api', parsedPath.dir)} (DELETE)`);
        }
    }
}


console.log('Server Routes:');
apiRouteStack.forEach((route) => { console.log(`- ${route}`); });
console.log('View Full OpenAPI Spec at http://localhost:3001/api-docs')

server.listen(process.env['SERVER_PORT'], () => { console.log(`Server listening on http://localhost:${process.env['SERVER_PORT']}`) });
