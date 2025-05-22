import { TrustfulResolverABI } from './lib/TrustfulResolverABI';
import { Context } from 'grammy';
import axios from 'axios';
import { getUserByHandler, saveUserData } from './supabase';
import { addVillager, attest, getTitles } from './trusftul/actions';
import { ROLES } from './trusftul/constants';
import { hasRole } from './trusftul/utils';
import { sendOp } from './send-op';
import ENV from './env';


export const commands: any = {};

commands['setup'] = async (ctx: Context) => {
  try {
    // Get the user ID from the context
    const tgId = ctx.from?.id.toString();

    if (!tgId) {
      await ctx.reply('Could not identify your user ID. Please try again.');
      return null;
    }

    // Create the abstract account
    const response = await axios.put(
      `/account-abstraction/platforms/${ENV.PLATFORM}/accounts?chain=sepolia`,
      { userIds: [tgId] }
    );

    // Extract the account and handler ID from the response
    // Adjust this based on the actual response structure
    const address = response.data?.accounts[0].account;
    const handlerId = ctx.from?.username;

    console.log('Account setup response:', handlerId);
    // TODO: gate on group
    if (handlerId && address) {
      // Save the user data to Supabase including the account
      const mappingResult = await saveUserData(handlerId, tgId, address);
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

commands['addTitle'] = async (ctx: Context) => {
  const title = ctx.message?.text?.split(' ')[1];
  if (!title) {
    await ctx.reply('Please provide a title');
    return;
  }
  const me = await getUserByHandler(ctx.from?.username || '');
  if (!me.success) {
    await ctx.reply(
      'You need to set up your account first. Use the /setup command.'
    );
    return;
  }
  const isManager = await hasRole(me.address!, ROLES.MANAGER);
  if (!isManager) {
    await ctx.reply('Only managers can add titles');
    return;
  }
  try {
    await sendOp([
      {
        account: ENV.BLESSNET_API_ACCOUNT!,
        target: ENV.RESOLVER,
        args: [title, true],
        functionName: 'setAttestationTitle',
        abi: TrustfulResolverABI,
      },
    ]);

    await ctx.reply('Title added successfully');
    return;
  } catch (error) {
    console.error('Error adding title:', error);
    await ctx.reply(error.message || 'Failed to add title');
    return;
  }
};

/**
 * Return all titles available to the users
 */
commands['titles'] = async (ctx: Context) => {
  const titles = await getTitles();
  await ctx.reply(
    `Available titles are:\n${titles.map((title) => `• ${title}`).join('\n')}`
  );
};

/**
 * Command handler for /attest
 * Accepts a mentioned user, gets their address, and sends an ATTEST_EVENT attestation
 */
commands['attest'] = async (ctx: Context) => {
  try {
    console.log('ctx', ctx.entities());
    const title = 'hey';
    const comment = 'something';
    console.log(ctx.message?.text);
    console.log(ctx.entities());
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
    console.log('Attesting', title, comment, mentionedUsers);
    for (const mentionedUser of mentionedUsers) {
      if (mentionedUser.success) {
        await attest({
          recipient: mentionedUser.address!,
          attester: me.address!,
          title,
          comment,
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
