import { ethers } from 'ethers';
import { TrustfulResolverABI } from './TrustfulResolverABI';
import axios from 'axios';
import { getAbstractAccount } from './get-abstract-account';
import { PLATFORM } from './attestations';
import { Context } from 'grammy';

// Chain configuration
const chain = '11145513';

const configs = {
  '11145513': {
    resolver: '0x7B1da691abc0BA2F4623cbae2BDD291Dd6735E06',
    UIDs: {
      ATTEST_MANAGER:
        '0xe0b1f4edc9136d8026dc3e01655ea093f38a6923d065d1464651f5fb10741b3d',
      ATTEST_VILLAGER:
        '0xadace4b84aad6e1701566bde338fca5f0e8306da73a917b3d968eaea057ca98d',
      ATTEST_EVENT:
        '0x071f94237e0f0dcddf7abaeeeac9164dca91a6e5ab5c320a06ee9338b385111a',
      ATTEST_RESPONSE:
        '0xd6e74bf303bc3699afa0fc249b8d026c936ddfc50e73eee03a8da227c1c6d83f',
    },
  },
};

const config = configs[chain];
const resolverContract = () =>
  new ethers.Contract(config.resolver, TrustfulResolverABI);

/**
 * This sends forms and sends a request to create an attestation
 */
export const giveAttestation = async (
  recipient: string,
  attester: string,
  attestationType: string = config.UIDs.ATTEST_MANAGER
) => {
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
    const response = await axios.post(
      '/account-abstraction/operations',
      {
        ops: [
          {
            account: accountData.account,
            target: config.resolver,
            calldata,
          },
        ],
      }
    );

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
export const addVillager = async (recipient: string, attester: string) => {
  try {
    const result = await giveAttestation(
      recipient,
      attester,
      config.UIDs.ATTEST_VILLAGER
    );
    
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
 * Command handler for adding a villager attestation
 * @param ctx The Telegram context
 */
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
