import { ethers } from 'ethers';
import { TrustfulResolverABI } from './TrustfulResolverABI';
import { Context } from 'grammy';
import axios from 'axios';
import { getAbstractAccount } from './get-abstract-account';
import { getUserByHandler, saveUserData } from './supabase';
import { giveAttestation } from './trustful';

export const PLATFORM = 'ZUITZERLAND';
const chain = '11145513';

const configs = {
  '11145513': {
    resolver: '0x7B1da691abc0BA2F4623cbae2BDD291Dd6735E06',
    eas: '0x47AF30cd03FBA8e1907C9105Ff059aE6Db94Aea0',
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
