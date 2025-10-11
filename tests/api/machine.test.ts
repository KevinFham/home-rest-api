import { beforeEach, vi } from 'vitest';
import { fs, vol } from 'memfs';
import { GET, PUT } from '../src/utils.ts';


vi.mock('node:fs');
vi.mock('node:fs/promises');

beforeEach(() => {
    vol.reset();
})

//test('"fping" and "wakeonlan" binaries', async () => {
//    expect((await promiseExec('fping -c1 -t600 0.1.1.1')).stderr).toBeTruthy();
//    expect((await promiseExec('fping localhost')).stdout).toBeTruthy();
//
//    expect((await promiseExec('wakeonlan 00:00:00:00:00')).stderr).toBeTruthy();
//})


