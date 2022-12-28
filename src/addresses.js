export const METERTEST = 83

export const addresses = {
    [METERTEST]: {
        GMX: '0x635bB9a3FeE749dcfC4beaE64DbcE7a24201C478',
        MTR: '0xfAC315d105E5A7fe2174B3EB1f95C257A9A5e271',
        MTRG: '0x8a419ef4941355476cf04933e90bf3bbf2f73814',
        RewardReader: '0x95801D11abfce3db2D9fEE98436241aB3Fa2E864',
        GLP: '0x11698092eeA7782a3d961F78f71C759664B6C718',
        GlpManager: '0x94dB843CB32842b81D1102D77f5F5F946Ce2a2D1',
        Reader: '0x1b3e285302CB684F3D7170511378185FAEe11416',
        Vault: '0x5AE9F9377653b7D4A5e69A7b880ad7D3C6944CaD'
    }
}

export function getAddress(chainId, key) {
    if (!(chainId) in addresses) {
        throw new Error(`Unknown chain ${chainId}`)
    }
    if (!(key in addresses[chainId])) {
        throw new Error(`Unknown address key ${key}`)
    }
    return addresses[chainId][key]
}
