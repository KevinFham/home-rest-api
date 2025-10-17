import { beforeAll, vi } from 'vitest';
import { GET, PUT } from '../../src/api/vps/index.ts';
import { mockRequest, mockResponse } from '../express-mocks.ts';

// TODO: Flesh out VPS tests

beforeAll(() => {
    vi.mock('../../src/utils.js', async (importOriginal) => {
        const actual = await importOriginal();
        return {
            DockerContext: actual.DockerContext,
            promiseExec: actual.promiseExec,
            parseConfig: actual.parseConfig,
            getOpenApiSpec: actual.getOpenApiSpec,
            isMachineUp(serverAddress: string, timeoutms: number) {
                return true;
            },
        }
    });

    vi.mock('../../src/contexts/doctl-context.js', async (importOriginal) => {
        const actual = await importOriginal();
        return {
            DoctlContext: actual.DoctlContext,
        }
    });

    vi.mock('../../src/api/vps/utils.js', async (importOriginal) => {
        const actual = await importOriginal();
        return {
            VPSController: actual.VPSController,
        }
    });
});

test('GET', async () => {
    expect(true).toBeTruthy();
});

test('PUT', async () => {
    expect(true).toBeTruthy();
});
