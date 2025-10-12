import { parseConfig } from '@/src/utils.js';

const cfg = parseConfig();

/*
* Dictionary based on config.yml where each key follows this convention:
* - { 'machineHostname': 'machineMacAddr' }
*/
export const MachineAddrDict = Object.assign({}, ...cfg.machines.machineHostnames.map((key: string) => ({[key]: cfg.machines.machineMacAddrs[cfg.machines.machineHostnames.indexOf(key)]})));
