import { beforeAll, vi } from 'vitest';
import { DoctlContext } from '../../src/contexts/doctl-context.js';


beforeAll(() => {
    vi.mock('../../src/utils.js', async (importOriginal) => {
        const actual = await importOriginal();
        return {
            DockerContext: actual.DockerContext,
            promiseExec(command: string) {
                if (command.includes('goodAPItoken')) {
                    return { stdout: 'success', err: null };
                } else if(command.includes('badAPItoken')) {
                    return { stdout: null, err: new Error('Invalid Token') };
                } else {
                    return { stdout: 'command run', err: null }
                }
            },
            parseConfig: actual.parseConfig,
            getOpenApiSpec: actual.getOpenApiSpec,
            isMachineUp: actual.isMachineUp,
        }
    });
});

test('doctl logic check', async () => {
    var doctlContext = new DoctlContext('badAPItoken');
    await expect(doctlContext.run('test command')).rejects.toThrowError();

    doctlContext = new DoctlContext('goodAPItoken');
    await expect(doctlContext.run('test command')).toBeTruthy();
});
