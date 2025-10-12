import { beforeAll, vi } from 'vitest';
import { GET, PUT } from '../../src/api/machine/index.ts';
import { mockRequest, mockResponse } from '../express-mocks.ts';

beforeAll(() => {
    vi.mock('../../src/api/machine/utils.js', () => { return { MachineAddrDict: { localhost: '127.0.0.1' } }; });
});

test('GET', async () => {
    const res = mockResponse();
    await GET(mockRequest({query: {machineHostname: 'localhost'}}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 0, message: 'Machine is up!'});

    await GET(mockRequest({query: {machineHostname: 'unregisteredhost'}}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 1, message: '"unregisteredhost" is not a registered hostname.'});
});

test('PUT', async () => {
    const res = mockResponse();
    await PUT(mockRequest({query: {machineHostname: 'localhost'}, action: 'startMachine'}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 0, message: 'Starting Machine!'});

    await PUT(mockRequest({query: {machineHostname: 'unregisteredhost'}, action: 'startMachine'}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 1, message: '"unregisteredhost" is not a registered hostname.'});

    await PUT(mockRequest({query: {machineHostname: 'localhost'}, action: 'unknownAction'}), res);
    expect(res._status).toBe(400);
    expect(res._send).toBe('Unknown Action "unknownAction".');
});
