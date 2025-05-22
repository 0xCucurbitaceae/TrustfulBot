export const ResolverFactoryABI = [
  {
    type: 'function',
    name: 'deployResolver',
    inputs: [
      { name: 'eas_', type: 'address', internalType: 'contract IEAS' },
      {
        name: 'schemaRegistry_',
        type: 'address',
        internalType: 'contract ISchemaRegistry',
      },
      { name: 'deployer_', type: 'address', internalType: 'address' },
      { name: 'managers_', type: 'address[]', internalType: 'address[]' },
    ],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'ResolverDeployed',
    inputs: [
      {
        name: 'resolver',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'deployer',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'schemaUIDs',
        type: 'bytes32[]',
        indexed: false,
        internalType: 'bytes32[]',
      },
    ],
    anonymous: false,
  },
  { type: 'error', name: 'InvalidEAS', inputs: [] },
  { type: 'error', name: 'InvalidSchemaRegistry', inputs: [] },
] as const;