import 'dotenv/config';
import type { Request, Response } from 'express';

const actionHandler = async (req: Request, res: Response) => {
    const payload = req.body;
    if( payload === undefined ) { res.status(400).send('Bad Request'); }
    else if ( !( 'action' in payload ) ) { res.status(400).send('Bad Request'); }

    res.status(200).send('Work in Progress');
}

export { actionHandler };
