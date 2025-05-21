import { ethers } from 'ethers';
import { TrustfulResolverABI } from './TrustfulResolverABI';
import axios from 'axios';
import { getAbstractAccount } from './get-abstract-account';
import { PLATFORM } from './commands';
import { Context } from 'grammy';
import dotenv from 'dotenv';

dotenv.config();

// Get private keys from environment variables
const TESTNET_PRIVATE_KEY = process.env.TESTNET_PRIVATE_KEY;
const MAINNET_PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY;

// Chain configuration
const chain = '11145513';

// Network configurations with providers
const networks = {
  ...(TESTNET_PRIVATE_KEY && {
    blessnetSepolia: {
      url: `https://blessnet-sepolia-testnet.rpc.caldera.xyz/http`,
      chainId: 11145513,
      provider: new ethers.JsonRpcProvider(
        `https://blessnet-sepolia-testnet.rpc.caldera.xyz/http`,
        11145513
      ),
      signer: new ethers.Wallet(
        TESTNET_PRIVATE_KEY,
        new ethers.JsonRpcProvider(
          `https://blessnet-sepolia-testnet.rpc.caldera.xyz/http`,
          11145513
        )
      ),
    },
  }),
  ...(MAINNET_PRIVATE_KEY && {
    blessnet: {
      url: `https://blessnet.calderachain.xyz/http`,
      chainId: 45513,
      provider: new ethers.JsonRpcProvider(
        `https://blessnet.calderachain.xyz/http`,
        45513
      ),
      signer: new ethers.Wallet(
        MAINNET_PRIVATE_KEY,
        new ethers.JsonRpcProvider(
          `https://blessnet.calderachain.xyz/http`,
          45513
        )
      ),
    },
  }),
};

export enum ROLES {
  ROOT = '0x79e553c6f53701daa99614646285e66adb98ff0fcc1ef165dd2718e5c873bee6',
  MANAGER = '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
  VILLAGER = '0x7e8ac59880745312f8754f56b69cccc1c6b2112d567ccf50e4e6dc2e39a7c67a',
}

export interface Schemas {
  uid: `0x${string}`;
  data: string;
  revocable: boolean;
  allowedRole: string[];
}

export interface BadgeTitle {
  title: string;
  uid: `0x${string}`;
  allowComment: boolean;
  revocable: boolean;
  data: string;
  allowedRole: string[];
}

export const ZUVILLAGE_BADGE_TITLES: () => BadgeTitle[] = () => [
  {
    title: 'Manager',
    uid: config.attestations.ATTEST_MANAGER.uid,
    allowComment: false,
    revocable: true,
    data: config.attestations.ATTEST_MANAGER.data,
    allowedRole: config.attestations.ATTEST_MANAGER.allowedRole,
  },
  {
    title: 'Check-in',
    uid: config.attestations.ATTEST_VILLAGER.uid,
    allowComment: false,
    revocable: false,
    data: config.attestations.ATTEST_VILLAGER.data,
    allowedRole: config.attestations.ATTEST_VILLAGER.allowedRole,
  },
  {
    title: 'Check-out',
    uid: config.attestations.ATTEST_VILLAGER.uid,
    allowComment: true,
    revocable: false,
    data: config.attestations.ATTEST_VILLAGER.data,
    allowedRole: config.attestations.ATTEST_VILLAGER.allowedRole,
  },
];

export const configs = {
  '11145513': {
    resolver: '0x7B1da691abc0BA2F4623cbae2BDD291Dd6735E06',
    provider: new ethers.JsonRpcProvider(
      `https://blessnet-sepolia-testnet.rpc.caldera.xyz/http`,
      11145513
    ),
    attestations: {
      ATTEST_MANAGER: {
        uid: '0xe0b1f4edc9136d8026dc3e01655ea093f38a6923d065d1464651f5fb10741b3d' as `0x${string}`,
        data: 'string role',
        revocable: true,
        allowedRole: [ROLES.ROOT],
      },
      ATTEST_VILLAGER: {
        uid: '0xadace4b84aad6e1701566bde338fca5f0e8306da73a917b3d968eaea057ca98d' as `0x${string}`,
        data: 'string status',
        revocable: false,
        allowedRole: [ROLES.MANAGER],
      },
      ATTEST_EVENT: {
        uid: '0x071f94237e0f0dcddf7abaeeeac9164dca91a6e5ab5c320a06ee9338b385111a' as `0x${string}`,
        data: 'string title,string comment',
        revocable: false,
        allowedRole: [ROLES.VILLAGER],
      },
      ATTEST_RESPONSE: {
        uid: '0xd6e74bf303bc3699afa0fc249b8d026c936ddfc50e73eee03a8da227c1c6d83f' as `0x${string}`,
        data: 'bool status',
        revocable: true,
        allowedRole: [ROLES.VILLAGER],
      },
    },
  },
  // '45513': {
  //   resolver: '0x7B1da691abc0BA2F4623cbae2BDD291Dd6735E06', // Update with mainnet resolver address when available
  //   provider: new ethers.JsonRpcProvider(
  //     `https://blessnet.calderachain.xyz/http`,
  //     45513
  //   ),
  //   UIDs: {
  //     ATTEST_MANAGER:
  //       '0xe0b1f4edc9136d8026dc3e01655ea093f38a6923d065d1464651f5fb10741b3d',
  //     ATTEST_VILLAGER:
  //       '0xadace4b84aad6e1701566bde338fca5f0e8306da73a917b3d968eaea057ca98d',
  //     ATTEST_EVENT:
  //       '0x071f94237e0f0dcddf7abaeeeac9164dca91a6e5ab5c320a06ee9338b385111a',
  //     ATTEST_RESPONSE:
  //       '0xd6e74bf303bc3699afa0fc249b8d026c936ddfc50e73eee03a8da227c1c6d83f',
  //   },
  // },
};

const config = configs[chain];
const resolverContract = (chainId = chain) => {
  const chainConfig = configs[chainId];
  if (!chainConfig || !chainConfig.provider) {
    throw new Error(`No provider configured for chain ${chainId}`);
  }
  return new ethers.Contract(
    chainConfig.resolver,
    TrustfulResolverABI,
    chainConfig.provider
  );
};

/**
 * This sends forms and sends a request to create an attestation
 */
export const giveAttestation = async ({
  recipient,
  attester,
  attestationType,
}: {
  recipient: string;
  attester: string;
  attestationType: string;
}) => {
  try {
    // Generate the calldata for the attestation
    const calldata = resolverContract().interface.encodeFunctionData('attest', [
      {
        uid: attestationType,
        schema: attestationType,
        time: 0,
        expirationTime: 0,
        revocationTime: 0,
        refUID:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        recipient,
        attester,
        revocable: false,
        data: '0x00',
      },
    ]);

    // Fetch the user's account address
    const accountData = await getAbstractAccount(recipient, 'telegram');

    if (!accountData.exists) {
      return { success: false, error: 'Recipient account does not exist' };
    }

    // Send the operation to the resolver
    const response = await axios.post('/account-abstraction/operations', {
      ops: [
        {
          account: accountData.account,
          target: config.resolver,
          calldata,
        },
      ],
    });

    console.log('Operation response:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error giving attestation:', error);
    return { success: false, error };
  }
};

/**
 * Adds a villager attestation to a recipient
 * @param recipient The recipient's ID
 * @param attester The attester's ID
 * @returns The result of the attestation
 */
export const addVillager = async (recipient: string) => {
  try {
    const result = await giveAttestation({
      recipient,
      attester: process.env.BLESSNET_API_ACCOUNT!,
      attestationType: config.UIDs.ATTEST_VILLAGER,
    });

    if (result.success) {
      console.log('Villager attestation added successfully');
      return { success: true, data: result.data };
    } else {
      console.error('Failed to add villager attestation:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error adding villager attestation:', error);
    return { success: false, error };
  }
};

/**
 * Return all titles available to the users
 */
export const getTitles = async () => {
  const contract = new ethers.Contract(
    config.resolver,
    TrustfulResolverABI,
    config.provider
  );
  const titles = await contract.getAllAttestationTitles();
  return titles;
};
/**
 * Command handler for adding a title to a user
 * @param ctx The Telegram context
 */
export const addTitleCommand = async (ctx: Context) => {
  try {
    // Parse the command: /addtitle @username Title Name
    const message = ctx.message?.text || '';
    const parts = message.split(' ');

    if (parts.length < 3) {
      await ctx.reply('Please use the format: /addtitle @username Title Name');
      return;
    }

    const usernameMatch = parts[1].match(/@([\w\d_]+)/);
    if (!usernameMatch) {
      await ctx.reply(
        'Please mention a user with @ symbol. Example: /addtitle @username Title Name'
      );
      return;
    }

    const username = usernameMatch[1];
    const title = parts.slice(2).join(' ');

    // Get the recipient's account
    const recipientAccount = await getAbstractAccount(username, PLATFORM);
    if (!recipientAccount.exists) {
      await ctx.reply(`The mentioned user doesn't have an account set up yet.`);
      return;
    }

    // Add the title
    const result = await addTitle(recipientAccount.account, title);

    if (result.success) {
      await ctx.reply(
        `Title "${title}" has been added to @${username} successfully!`
      );
    } else {
      await ctx.reply(
        `Failed to add title. Error: ${
          result.error?.message || 'Unknown error'
        }`
      );
    }
  } catch (error) {
    console.error('Error in add title command:', error);
    await ctx.reply('An error occurred while processing your request.');
  }
};

export const addVillagerCommand = async (ctx: Context) => {
  try {
    // Check if there's a mentioned user
    const message = ctx.message?.text || '';
    const mentionMatch = message.match(/@([\w\d_]+)/);

    if (!mentionMatch) {
      await ctx.reply('Please mention a user to add as a villager. Example: /addvillager @username');
      return;
    }

    const mentionedUsername = mentionMatch[1];

    // Get the sender's ID
    const senderId = ctx.from?.id.toString()!;

    // Check if the sender has an account
    const senderAccount = await getAbstractAccount(senderId, PLATFORM);
    if (!senderAccount.exists) {
      await ctx.reply('You need to set up your account first. Use the /setup command.');
      return;
    }

    // For demonstration purposes, we'll use the mentioned username as the recipient ID
    const recipientId = mentionedUsername;

    // Attempt to get the recipient's account
    const recipientAccount = await getAbstractAccount(recipientId, PLATFORM);
    if (!recipientAccount.exists) {
      await ctx.reply(`The mentioned user doesn't have an account set up yet.`);
      return;
    }

    // Send the ATTEST_VILLAGER attestation
    const result = await addVillager(recipientId, senderId);

    if (result.success) {
      await ctx.reply(`@${mentionedUsername} has been successfully added as a villager!`);
    } else {
      await ctx.reply('Failed to add villager. Please try again later.');
    }
  } catch (error) {
    console.error('Error in add villager command:', error);
    await ctx.reply('An error occurred while processing your request.');
  }
};
