export const SchemaRegistryAbi = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "schema",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "resolver",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "revocable",
        "type": "bool"
      }
    ],
    "name": "register",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "uid",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "uid",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "registerer",
        "type": "address"
      }
    ],
    "name": "SchemaRegistered",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "uid",
        "type": "bytes32"
      }
    ],
    "name": "getSchema",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "uid",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "resolver",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "revocable",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "schema",
            "type": "string"
          }
        ],
        "internalType": "struct SchemaRecord",
        "name": "record",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
