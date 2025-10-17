import { beforeAll, vi } from 'vitest';
import { DockerContext } from '../../src/contexts/docker-context.js';


beforeAll(() => {
    vi.mock('../../src/utils.js', async (importOriginal) => {
        const actual = await importOriginal();
        return {
            DockerContext: actual.DockerContext,
            promiseExec(command: string) {
                if (command.includes('goodAPItoken')) {

                } else {

                }
            },
            parseConfig: actual.parseConfig,
            getOpenApiSpec: actual.getOpenApiSpec,
            isMachineUp: actual.isMachineUp,
        }
    });
});

test('docker without tls', async () => {
    var dockerContext = new DockerContext({ hostname: 'localhost', tlsEnabled: false });
    await expect(dockerContext.run('test command')).rejects.toThrowError();

});

test('docker with tls', async () => {
    var dockerContext = new DockerContext({ hostname: 'localhost', tlsEnabled: true, tslCertDir: '/fakedirectory' });
    await expect(dockerContext.run('test command')).rejects.toThrowError();

});
