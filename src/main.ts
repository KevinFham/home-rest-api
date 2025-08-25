import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import express from 'express';

const SERVER_PORT = process.env.SERVER_PORT | 3000;
const server = express();
server.use( express.json() );
server.use( express.urlencoded( { extended: true } ) );

// Import API source code from folder structure
const foldersPath = path.join(__dirname, 'api');
const apiFolders = fs.readdirSync(foldersPath);
const apiRouteStack = [];
for (const folder of apiFolders) {
    const apiPath = path.join(foldersPath, folder);
    const apiFiles = fs.readdirSync(apiPath).filter(file => file.endsWith('.ts'));
    for (const file of apiFiles) {
        const filePath = path.join(apiPath, file);
        const api = await import(filePath);
        if ('actionHandler' in api) {
            server.post(path.join('/api', folder), ( req, res ) => { api.actionHandler( server, req, res ); });
            apiRouteStack.push(path.join('/api', folder));
        }
    }
}

console.log('Server Routes:');
server.router.stack.forEach((r) => { 
    if(r.name === 'handle') { console.log(`- ${r.route.path}`); } 
});

server.listen(SERVER_PORT, () => { console.log(`Server listening on http://localhost:${SERVER_PORT}`) });
