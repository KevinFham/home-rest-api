import { beforeAll, vi } from 'vitest';
import { GET, PUT } from '../../src/api/mc-server/index.ts';
import { mockRequest, mockResponse } from '../express-mocks.ts';

beforeAll(async () => {
    vi.mock('../../src/utils.js', async (importOriginal) => {
        const actual = await importOriginal();
        return {
            DockerContext: actual.DockerContext,
            promiseExec: actual.promiseExec,
            parseConfig(configPath: string) {
                return {
                    mcServer: {
                        serverHostname: 'localhost',
                        mcServerAliases: ['survival-world-active'],
                        mcServerContainerNames: ['survival_world_active']
                    }
                }
            },
            getOpenApiSpec: actual.getOpenApiSpec,
            isMachineUp(serverAddress: string, timeoutms: number) {
                return true;
            },
        }
    });

    vi.mock('../../src/api/mc-server/utils.js', async (importOriginal) => { 
        const actual = await importOriginal();
        return { 
            McDockerContext: actual.McDockerContext,
            ServerStatus: actual.ServerStatus,
            ServerAliasDict: { 
                "survival-world-active": 'survival_world_active',
                "survival-world-active-idle": 'survival_world_active_idle',
                "survival-world-starting": 'survival_world_starting',
                "survival-world-stopped": 'survival_world_stopped',
                "survival-world-error": 'survival_world_error',
                "survival-world-unknown": 'survival_world_unknown'
            },
            getMinecraftServerStatus(mcServerContainerName: string) {
                if (mcServerContainerName.includes('survival_world_active')) { return actual.ServerStatus.ACTIVE; }
                else if (mcServerContainerName.includes('survival_world_active_idle')) { return actual.ServerStatus.STARTING; }
                else if (mcServerContainerName.includes('survival_world_starting')) { return actual.ServerStatus.STARTING; }
                else if (mcServerContainerName.includes('survival_world_stopped')) { return actual.ServerStatus.STOPPED; }
                else if (mcServerContainerName.includes('survival_world_error')) { return actual.ServerStatus.ERROR; }
                else { return actual.ServerStatus.UNKNOWN; }
            },
            getMinecraftServerPlayers(mcServerContainerName: string) {
                if (mcServerContainerName.includes('survival_world_active') && !mcServerContainerName.includes('idle')) { return [ 'palm_knee', 'TheDarkLord', 'xX_baconeggcheese_Xx' ]; }
                else { return []; }
            }
        }; 
    });
});

test('GET', async () => {
    const res = mockResponse();
    await GET(mockRequest({query: { mcInstance: 'unknowninstance' }}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 1, message: 'unknowninstance not recognized in server aliases'});

    await GET(mockRequest({query: { mcInstance: 'survival-world-active' }}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 0, serverStat: 'running', players: ['palm_knee', 'TheDarkLord', 'xX_baconeggcheese_Xx'], message: 'Minecraft server is up and running!'});

    await GET(mockRequest({query: { mcInstance: 'survival-world-starting' }}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 0, serverStat: 'starting', players: [], message: 'Minecraft server is starting!'});

    await GET(mockRequest({query: { mcInstance: 'survival-world-stopped' }}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 0, serverStat: 'exited', players: [], message: 'Minecraft server is shut down!'});
    
    await GET(mockRequest({query: { mcInstance: 'survival-world-error' }}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 1, serverStat: 'error', players: [], message: 'Minecraft server has an error!'});

    await GET(mockRequest({query: { mcInstance: 'survival-world-unknown' }}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 1, serverStat: 'unknown', players: [], message: 'Minecraft server status unknown.'});
});

test('PUT', async () => {
    const res = mockResponse();
    await GET(mockRequest({query: { mcInstance: 'unknowninstance' }, action: 'startMinecraftServer'}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 1, message: 'unknowninstance not recognized in server aliases'});

    await PUT(mockRequest({query: { mcInstance: 'survival-world-active' }, action: 'unknownAction'}), res);
    expect(res._status).toBe(400);
    expect(res._send).toBe('Unknown Action "unknownAction".');


    //startMinecraftServer
    await PUT(mockRequest({query: { mcInstance: 'survival-world-active' }, action: 'startMinecraftServer'}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 1, message: 'Minecraft server is already up and running!'});

    await PUT(mockRequest({query: { mcInstance: 'survival-world-starting' }, action: 'startMinecraftServer'}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 1, message: 'Minecraft server is already starting!'});

    await PUT(mockRequest({query: { mcInstance: 'survival-world-stopped' }, action: 'startMinecraftServer'}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 0, message: 'Starting Minecraft server!'});

    await PUT(mockRequest({query: { mcInstance: 'survival-world-stopped' }, action: 'startMinecraftServer'}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 0, message: 'Starting Minecraft server!'});

    await PUT(mockRequest({query: { mcInstance: 'survival-world-stopped' }, action: 'startMinecraftServer'}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 0, message: 'Starting Minecraft server!'});

    //stopMinecraftServer
    await PUT(mockRequest({query: { mcInstance: 'survival-world-active' }, action: 'stopMinecraftServer'}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 1, message: '3 players online! Aborting shutdown.'});

    await PUT(mockRequest({query: { mcInstance: 'survival-world-active-idle' }, action: 'stopMinecraftServer'}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 0, message: 'Shutting down Minecraft server...'});
    
    await PUT(mockRequest({query: { mcInstance: 'survival-world-starting' }, action: 'stopMinecraftServer'}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 1, message: 'Minecraft server is starting up. Please wait until server is fully up and running.'});

    await PUT(mockRequest({query: { mcInstance: 'survival-world-stopped' }, action: 'stopMinecraftServer'}), res);
    expect(res._status).toBe(200);
    expect(res._send).toStrictEqual({code: 1, message: 'Minecraft server is already stopped!'});
});
