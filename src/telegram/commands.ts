import { TrustfulResolverABI } from '../abis/TrustfulResolverABI';
import { Context } from 'grammy';
import axios from 'axios';
import { getUserByHandler, saveUserData } from '../lib/supabase';
import { addVillager, attest, getTitles } from '../trusftul/actions';
import { config, ROLES } from '../trusftul/constants';
import { hasRole } from '../trusftul/utils';
import { sendOp } from '../lib/send-op';
import ENV from '../lib/env';
import { ethers, Contract, AddressLike } from 'ethers';
import { EntryPointABI } from '../abis/EntryPoint';
import { blessedAccountABI } from '../abis/BlessedAccount';

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
      {
        userIds: [tgId],
        // TODO: fund on creation
        // funding: { amount: ethers.parseEther('0.001') }
      }
    );

    const { account: address, message } = response.data?.accounts[0];
    const handlerId = ctx.from?.username;

    console.log('Account setup response:', handlerId);
    const promises: any[] = [];
    // TODO: gate on group
    if (handlerId && address) {
      // Save the user data to Supabase including the account
      promises.push(addVillager(address));
      promises.push(saveUserData(handlerId, tgId, address));

      // the blessnet API does not yet support funding new accounts
      // so we do it manually for now, using a pK and a dedicated address
      // in a future version, the above call should do it for us.
      if (message === 'Account already exists') {
        const signer = new ethers.Wallet(
          process.env.FUNDER_PRIVATE_KEY!,
          config.provider
        );
        console.log(ENV.ENTRYPOINT);
        const entryPoint = new ethers.Contract(
          ENV.ENTRYPOINT,
          EntryPointABI,
          signer
        );
        promises.push(
          entryPoint.depositTo(address, {
            value: ethers.parseEther('0.006'),
          })
        );
      }

      const results = await Promise.allSettled(promises);
      let i = 0;
      let errors = '';
      for (const result of results) {
        if (result.status === 'rejected') {
          console.error('Failed to save user data:', result.reason);
          errors += `Failed to save user data: ${result.reason}\n`;
        }
        i++;
      }
      await ctx.reply(
        `Your account has been set up successfully!\nHandler ID: ${handlerId}\nAccount: ${address}\n${errors}`
      );
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
  // const isManager = await hasRole(me.address!, ROLES.MANAGER);
  // if (!isManager) {
  //   await ctx.reply('Only managers can add titles');
  //   return;
  // }
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
    // considering a text such as: `/attest @username1 @username2 title some description i add`
    // split it so that we get all mentions, the title and the comment
    const text = ctx.message?.text || '';
    const mentions = ctx
      .entities()
      .filter((entity) => entity.type === 'mention');

    const lastMention = mentions[mentions.length - 1];
    const postMentionsText = text
      .slice(lastMention.offset + lastMention.length)
      .trim();
    const [title, ...description] = postMentionsText.split(' ');
    const comment = description.join(' ').trim() || 'NO_COMMENT';

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
    await ctx.reply(
      error.message || 'An error occurred while processing your request.'
    );
  }
};

commands['whoami'] = async (ctx: Context) => {
  try {
    const username = ctx.from?.username;
    if (!username) {
      await ctx.reply(
        'Could not identify your Telegram username. Please ensure it is set.'
      );
      return;
    }

    const userData = await getUserByHandler(username);

    if (!userData.success || !userData.address) {
      await ctx.reply(
        'Your account is not set up yet or your address is not found. Please use the /setup command first.'
      );
      return;
    }

    const blessedAccountAddress = userData.address as AddressLike;

    const blessedAccountContract = new Contract(
      userData.address,
      blessedAccountABI,
      config.provider
    );

    let balanceBigInt: bigint;
    try {
      balanceBigInt = await blessedAccountContract.getDeposit();
    } catch (readError: any) {
      console.error(
        `Error reading getDeposit for ${blessedAccountAddress}:`,
        readError
      );
      if (
        readError.code === 'CALL_EXCEPTION' ||
        readError.message?.includes('call revert exception')
      ) {
        await ctx.reply(
          `Your registered address is: ${blessedAccountAddress}\n\nCould not fetch balance. This address might not be a smart contract account with a deposit function, or it may not be fully set up on the network yet.`
        );
      } else {
        await ctx.reply(
          `Your registered address is: ${blessedAccountAddress}\n\nAn error occurred while fetching your balance. Please try again later.`
        );
      }
      return;
    }

    const balanceEth = ethers.formatEther(balanceBigInt);

    await ctx.reply(
      `Hello @${username}!
Your blessed account address is: ${blessedAccountAddress}
Your current deposit balance is: ${balanceEth} ETH`
    );
  } catch (error: any) {
    console.error('Error in /whoami command:', error);
    await ctx.reply(
      'An unexpected error occurred while fetching your details. Please try again later.'
    );
  }
};
