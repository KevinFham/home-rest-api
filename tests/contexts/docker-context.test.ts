import { beforeAll, vi } from 'vitest';
import { DockerContext } from '../../src/contexts/docker-context.js';


beforeAll(() => {
    vi.mock('../../src/utils.js', async (importOriginal) => {
        const actual = await importOriginal();
        return {
            DockerContext: actual.DockerContext,
            promiseExec(command: string) {
                if (command.includes('badsocket')) {
                    return { stderr: 'Bad Socket', err: new Error('Bad Socket') };
                } else if (command.includes('existingcontext') && command.includes('context create')) {
                    return { stderr: 'Context already exists.', err: new Error('Context already exists.') };
                } else if (command.includes('badcontext') && command.includes('context create')) {
                    return { stderr: 'Bad Context', err: new Error('Bad Context') };
                } else {
                    return { stdout: 'success', stderr: '' }
                }
            },
            parseConfig: actual.parseConfig,
            getOpenApiSpec: actual.getOpenApiSpec,
            isMachineUp(hostname: string) {
                if (hostname.includes('downhostname')) { return false; }
                else { return true; }
            },
        }
    });
});

test('docker without tls', async () => {
    var dockerContext = new DockerContext({ hostname: 'downhostname', tlsEnabled: false });
    await expect(dockerContext.run('test command')).rejects.toThrowError(new Error('Failed to connect to downhostname for docker context.'));

    dockerContext = new DockerContext({ hostname: 'localhost', protocol: 'badsocket://', tlsEnabled: false });
    await expect(dockerContext.run('test command')).rejects.toThrowError(new Error('Failed to connect to docker socket at badsocket://localhost:2376: Error: Bad Socket'));

    dockerContext = new DockerContext({ hostname: 'localhost', protocol: 'existingcontext://', tlsEnabled: false });
    const promiseExecSpy = vi.spyOn(await import('../../src/utils.js'),'promiseExec');
    await expect(dockerContext.run('test command')).toBeTruthy();
    expect(promiseExecSpy).toHaveBeenCalledTimes(1);

    dockerContext = new DockerContext({ hostname: 'localhost', protocol: 'badcontext://', tlsEnabled: false }); 
    await expect(dockerContext.run('test command')).rejects.toThrowError(new Error('Failed to create docker context for localhost: Error: Bad Context'));

    dockerContext = new DockerContext({ hostname: 'localhost', tlsEnabled: false });
    await expect(dockerContext.run('test command')).toBeTruthy();
});

test('docker with tls', async () => {
    var dockerContext = new DockerContext({ hostname: 'localhost', tlsEnabled: true, tlsCertDir: '/fakedirectory' });
    expect(dockerContext.tlsCertDir).toBe('/fakedirectory');

    //TODO: local directory check relies on appending it to globalThis.projectDir, which I'm not sure how to mock.
    //dockerContext = new DockerContext({ hostname: 'localhost', tlsEnabled: true, tlsCertDir: './localfakedirectory' });
    //expect(dockerContext.tlsCertDir).toBe('./localfakedirectory');
});
