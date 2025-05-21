import { ethers } from 'ethers';
import { TrustfulResolverABI } from './TrustfulResolverABI';
import { Context } from 'grammy';
import axios from 'axios';
import { getAbstractAccount } from './get-abstract-account';
import { getUserByHandler, saveUserData } from './supabase';
import { addVillager, configs, getTitles, giveAttestation } from './trustful';
import { sendOp } from './send-op';

export const PLATFORM = 'ZUITZERLAND';
const chain = '11145513';

const config = configs[chain];
// const resolverContract = () =>
//   new ethers.Contract(config.resolver, TrustfulResolverABI);

export const setupAccount = async (ctx: Context) => {
  try {
    // Get the user ID from the context
    const tgId = ctx.from?.id.toString();

    if (!tgId) {
      await ctx.reply('Could not identify your user ID. Please try again.');
      return null;
    }

    // Create the abstract account
    const response = await axios.put(
      `/account-abstraction/platforms/${PLATFORM}/accounts?chain=sepolia`,
      { userIds: [tgId] }
    );

    // Extract the account and handler ID from the response
    // Adjust this based on the actual response structure
    const address = response.data?.accounts[0].account;
    const handlerId = ctx.from?.username;

    console.log('Account setup response:', handlerId);
    if (handlerId && address) {
      // Save the user data to Supabase including the account
      const mappingResult = await saveUserData(
        handlerId,
        tgId,
        address,
        PLATFORM
      );
      await addVillager(address);

      if (mappingResult.success) {
        console.log('User data saved successfully:', mappingResult.data);
        await ctx.reply(
          `Your account has been set up successfully!\nHandler ID: ${handlerId}\nAccount: ${address}`
        );
      } else {
        console.error('Failed to save user data:', mappingResult.error);
        await ctx.reply(
          'Your account was created, but there was an issue saving your user data.'
        );
      }
    } else {
      console.error(
        'Missing account or handler ID in response:',
        response.data
      );
      await ctx.reply(
        'Your account was created, but we could not identify your account or handler ID.'
      );
    }

    return response.data;
  } catch (error) {
    console.error('Error setting up account:', error);
    if (ctx) {
      await ctx.reply(
        'An error occurred while setting up your account. Please try again later.'
      );
    }
    return null;
  }
};

export const addTitle = async (ctx: Context) => {
  const title = ctx.message?.text?.split(' ')[1];
  if (!title) {
    await ctx.reply('Please provide a title');
    return;
  }
  try {
    const res = await sendOp([
      {
        account: process.env.BLESSNET_API_ACCOUNT!,
        target: config.resolver,
        args: [title, true],
        functionName: 'setAttestationTitle',
        abi: TrustfulResolverABI,
      },
    ]);

    const deliveryId = res.deliveryIds[0];

    console.log(deliveryId);
    // poll delivery status
    const pollInterval = setInterval(async () => {
      const response = await axios.get(`/deliveries/${deliveryId}`);
      const status = response.data.status;
      console.log(status);
      if (status === 'delivered') {
        clearInterval(pollInterval);
        await ctx.reply('Title added successfully');
      }
      if (status === 'failed') {
        clearInterval(pollInterval);
        await ctx.reply('Tx to add title failed');
      }
    }, 500);
    return;
  } catch (error) {
    console.error('Error adding title:', error);
    await ctx.reply('Failed to add title');
    return;
  }
};

/**
 * Return all titles available to the users
 */
export const getTitlesCommand = async (ctx: Context) => {
  const titles = await getTitles();
  await ctx.reply(`Available titles are:\n${titles.map((title) => `• ${title}`).join('\n')}`);
};

// giveAttestation function has been moved to trustful.ts

/**
 * Command handler for /attest
 * Accepts a mentioned user, gets their address, and sends an ATTEST_EVENT attestation
 */
export const attestCommand = async (ctx: Context) => {
  try {
    console.log('ctx', ctx.entities());
    await ctx.reply(
      'Please mention a user to attest. Example: /attest @username'
    );
    const mentions = ctx
      .entities()
      .filter((entity) => entity.type === 'mention');
    if (mentions.length === 0) {
      await ctx.reply(
        'Please mention a user to attest. Example: /attest @username'
      );
      return;
    }
    const me = await getUserByHandler(ctx.from?.username || '');
    if (!me.success) {
      await ctx.reply(
        'You need to set up your account first. Use the /setup command.'
      );
      return;
    }
    const mentionedUsers = await Promise.all(
      mentions
        .map((mention) => mention.text.replace('@', ''))
        .map((handle) => getUserByHandler(handle))
    );
    for (const mentionedUser of mentionedUsers) {
      if (!mentionedUser.success) {
        await giveAttestation({
          recipient: mentionedUser.account!,
          attester: me.user_id!,
          attestationType: config.UIDs.ATTEST_EVENT,
        });
      }
    }
    await ctx.reply(
      `Attestation to ${mentions
        .map((mention) => mention.text)
        .join(', ')} has been submitted successfully!`
    );
    return;
  } catch (error) {
    console.error('Error in attest command:', error);
    await ctx.reply('An error occurred while processing your request.');
  }
};
