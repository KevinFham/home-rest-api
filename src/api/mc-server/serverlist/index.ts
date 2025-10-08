import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import type { Request, Response } from 'express';
import { parseConfig, getOpenApiSpec } from '@/src/utils.js';

const cfg = parseConfig();

const { oApiSpec_GET } = getOpenApiSpec(path.join(__dirname, '/api-doc.yml'));

const GET = async ( _req: Request, res: Response ) => {
    res.status(200).send({ code: 0, message: JSON.stringify({
        mcServerAliases: cfg.mcServer.mcServerAliases,
        mcServerAddrs: cfg.mcServer.mcServerAddrs
    }) });
}

export { GET, oApiSpec_GET };
