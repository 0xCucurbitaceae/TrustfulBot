import { ethers } from 'ethers';
import { TrustfulResolverABI } from './lib/TrustfulResolverABI';
import axios from 'axios';
import { getAbstractAccount } from './get-abstract-account';
import { PLATFORM } from './commands';
import { Context } from 'grammy';
import dotenv from 'dotenv';
import { sendOp } from './send-op';
import { EASABI } from './lib/EASABI';

dotenv.config();

// Chain configuration
const chain = '11145513';

export enum ROLES {
  ROOT = '0x79e553c6f53701daa99614646285e66adb98ff0fcc1ef165dd2718e5c873bee6',
  MANAGER = '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
  VILLAGER = '0x7e8ac59880745312f8754f56b69cccc1c6b2112d567ccf50e4e6dc2e39a7c67a',
}

export interface Schemas {
  uid: `0x${string}`;
  schema: string[];
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

/************************
 *                      *
 *        UTILS         *
 *                      *
 ***********************/

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
    eas: '0x47AF30cd03FBA8e1907C9105Ff059aE6Db94Aea0',
    provider: new ethers.JsonRpcProvider(
      `https://blessnet-sepolia-testnet.rpc.caldera.xyz/http`,
      11145513
    ),
    attestations: {
      ATTEST_MANAGER: {
        uid: '0xe0b1f4edc9136d8026dc3e01655ea093f38a6923d065d1464651f5fb10741b3d' as `0x${string}`,
        schema: ['string'], // role
        revocable: true,
        allowedRole: [ROLES.ROOT],
      },
      ATTEST_VILLAGER: {
        uid: '0xadace4b84aad6e1701566bde338fca5f0e8306da73a917b3d968eaea057ca98d' as `0x${string}`,
        schema: ['string'], // status
        revocable: false,
        allowedRole: [ROLES.MANAGER],
      },
      ATTEST_EVENT: {
        uid: '0x071f94237e0f0dcddf7abaeeeac9164dca91a6e5ab5c320a06ee9338b385111a' as `0x${string}`,
        schema: ['string', 'string'], // title, comment
        revocable: false,
        allowedRole: [ROLES.VILLAGER],
      },
      ATTEST_RESPONSE: {
        uid: '0xd6e74bf303bc3699afa0fc249b8d026c936ddfc50e73eee03a8da227c1c6d83f' as `0x${string}`,
        schema: ['bool'], // status
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

const getResolverContract = () =>
  new ethers.Contract(config.resolver, TrustfulResolverABI, config.provider);

interface AttestationRequest {
  schema: string;
  data: AttestationRequestData;
}

interface AttestationRequestData {
  recipient: string; // The recipient of the attestation.
  expirationTime: number; // The time when the attestation expires (Unix timestamp).
  revocable: boolean; // Whether the attestation is revocable.
  refUID: string; // The UID of the related attestation.
  data: string; // Custom attestation data.
  value: number; // An explicit ETH amount to send to the resolver. This is important to prevent accidental user errors.
}
/**
 * This sends forms and sends a request to create an attestation
 */
export const giveAttestation = async ({
  recipient,
  attester,
  attestationType,
  args,
}: {
  recipient: string;
  attester: string;
  attestationType: keyof typeof config.attestations;
  args: any[];
}) => {
  const { uid, schema } = config.attestations[attestationType];
  const data = ethers.AbiCoder.defaultAbiCoder().encode(schema, args);
  const attestData: AttestationRequestData = {
    expirationTime: 0,
    refUID:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    recipient,
    revocable: false,
    data,
    value: 0,
  };

  const attestationRequest: AttestationRequest = {
    schema: uid,
    data: attestData,
  };

  console.log(attestationRequest);

  await sendOp([
    {
      target: config.eas,
      abi: EASABI,
      functionName: 'attest',
      account: attester,
      args: [attestationRequest],
    },
  ]);
};

/************************
 *                      *
 *       FEATURES       *
 *                      *
 ***********************/

/**
 * Adds a villager attestation to a recipient
 * @param recipient The recipient's ID
 */
export const addVillager = async (recipient: string) => {
  console.log('Adding villager', recipient);
  const contract = getResolverContract();
  const isVillager = await contract.hasRole(ROLES.VILLAGER, recipient);
  if (isVillager) {
    console.log('Already a villager');
    return {
      success: false,
      message: 'User is already a villager',
    };
  }
  await giveAttestation({
    recipient,
    attester: process.env.BLESSNET_API_ACCOUNT!,
    attestationType: 'ATTEST_VILLAGER',
    args: ['Check-in'],
  });
};

/**
 * Return all titles available to the users
 */
export const getTitles = async () => {
  const contract = getResolverContract();
  const titles = await contract.getAllAttestationTitles();
  return titles;
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
