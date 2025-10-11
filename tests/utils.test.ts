import { beforeEach, vi } from 'vitest';
import { fs, vol } from 'memfs';
import { promiseExec, parseConfig, getOpenApiSpec, isMachineUp } from '../src/utils.ts';


vi.mock('node:fs');
vi.mock('node:fs/promises');

beforeEach(() => {
    vol.reset();
})

test('"fping" and "wakeonlan" binaries', async () => {
    expect((await promiseExec('fping -c1 -t600 0.1.1.1')).stderr).toBeTruthy();
    expect((await promiseExec('fping localhost')).stdout).toBeTruthy();

    expect((await promiseExec('wakeonlan 00:00:00:00:00')).stderr).toBeTruthy();
})

test('Main configuration file parsing', () => {
    fs.writeFileSync('/config.yml', 'main:\n  sub1: "a"\n  sub2: "b"');
    const cfg = parseConfig('/config.yml');
    expect(cfg).toStrictEqual({main: {sub1: "a", sub2: "b"}});
})

test('Open API Specification parsing', () => {
    fs.writeFileSync('/api-doc.yml', 'GET:\n  get: "a"\nPOST:\n  post: "b"\nPUT:\n  put: "c"');
    const { oApiSpec, oApiSpec_GET, oApiSpec_POST, oApiSpec_PUT, oApiSpec_DELETE } = getOpenApiSpec('/api-doc.yml');

    expect(oApiSpec).toStrictEqual({GET: {get: "a"}, POST: {post: "b"}, PUT: {put: "c"}});
    expect(oApiSpec_GET).toStrictEqual({get: "a"});
    expect(oApiSpec_POST).toStrictEqual({post: "b"});
    expect(oApiSpec_PUT).toStrictEqual({put: "c"});
    expect(oApiSpec_DELETE).toBeFalsy();
})

test('Machine up check', async () => {
    expect(await isMachineUp('localhost')).toBeTruthy();
    expect(await isMachineUp('0.1.1.1')).toBeFalsy();
})
