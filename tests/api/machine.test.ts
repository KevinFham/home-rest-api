import { beforeEach, vi } from 'vitest';
import { fs, vol } from 'memfs';
import { GET, PUT } from '../../src/api/machine/index.ts';
import { mockRequest, mockResponse } from '../express-mocks.ts';

test('GET', async () => {
    vi.mock('../../src/api/machine/utils.js', () => { return { MachineAddrDict: { localhost: '127.0.0.1' } }; });

    const res = mockResponse();
    await GET(mockRequest('localhost'), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 0, message: 'Machine is up!'});

    await GET(mockRequest('unregisteredhost'), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 1, message: '"unregisteredhost" is not a registered hostname.'});
});

test('PUT', async () => {
    vi.mock('../../src/api/machine/utils.js', () => { return { MachineAddrDict: { localhost: '127.0.0.1' } }; });

    const res = mockResponse();
    await PUT(mockRequest('localhost', 'startMachine'), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 0, message: 'Starting Machine!'});

    await PUT(mockRequest('unregisteredhost', 'startMachine'), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 1, message: '"unregisteredhost" is not a registered hostname.'});

    await PUT(mockRequest('localhost', 'unknownAction'), res);
    expect(res._status).toBe(400);
    expect(res._send).toBe('Unknown Action "unknownAction".');
});
