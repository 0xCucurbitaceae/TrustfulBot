# Setup

This documents the steps needed to setup the infrastructure from scratch for a new chain.
As EAS and schemas are already deploed and registered on blessnet and blessnet sepolia, most of these are not needed.

## 1. Deploy EAS + Schema registry

EAS must deploy 2 contracts: the attestation service, and the schema registry.

1. Download [the EAS repository](https://github.com/ethereum-attestation-service/eas-contracts)
2. Add this script to `/scripts/deploy`

```ts
// scripts/deploy.ts
import hre, { ethers } from 'hardhat';
import Contracts from '../components/Contracts';
import { verifyContractsWithEtherscan } from './verifyWithEtherscan';


async function main() {
  const [deployer] = await ethers.getSigners();

  const contracts = Contracts.connect(deployer);
  const registry = await contracts.SchemaRegistry.deploy();
  const EAS = await contracts.EAS.deploy(registry.target);

  console.log('EAS deployed to:', EAS.target);
  console.log('Registry deployed to:', registry.target);

  hre.run('verify:verify', {
    address: registry.target,
    constructorArguments: []
  });
  hre.run('verify:verify', {
    address: EAS.target,
    constructorArguments: [registry.target]
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

```

3. Run `npx hardhat run scripts/deploy.ts --network blessnet` (you'll need to add blessnet to `hardhat.config.ts`)

## 2. Deploy resolver

Download the resolver from the trustful repo and deploy it.

1. Download [the resolver repository](https://github.com/trustful-attestation-service/resolver)
2.