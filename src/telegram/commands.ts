import { resolveEnsName } from '@/lib/utils';
import axios from 'axios';
import { ethers } from 'ethers';
import { Context } from 'grammy';
import { EntryPointABI } from '../abis/EntryPoint';
import { TrustfulResolverABI } from '../abis/TrustfulResolverABI';
import ENV from '../lib/env';
import { sendOp } from '../lib/send-op';
import { getUserByHandler, saveUserData } from '../lib/supabase';
import { isAdmin } from '../lib/tg-utils';
import { addVillager, attest, getTitles } from '../trusftul/actions';
import { config, ROLES } from '../trusftul/constants';
import { giveAttestation, hasRole } from '../trusftul/utils';

export const commands: {
  [key: string]: (ctx: Context) => Promise<void>;
} = {};

if (process.env.NODE_ENV !== 'production') {
  commands['test'] = async (ctx: Context) => {
    await ctx.reply('tester command');
  };
}

commands['help'] = async (ctx: Context) => {
  await ctx.reply(
    `Available commands:
    /setup [your-main-address] - setup your account and check in to the village (address is optional)
    /addbadge badge-name - add a new badge
    /attest @user badge-name and some description! - give an attestation
    /badges - see available badges`
  );
};

commands['setup'] = async (ctx: Context) => {
  try {
    // Get the user ID from the context
    const tgId = ctx.from?.id.toString();
    const handlerId = ctx.from?.username;
    const commandArgs = ctx.message?.text?.split(' ') || [];
    // commandArgs[0] is '/setup', commandArgs[1] (if exists) is the optional address
    let canonAddressRaw = commandArgs.length > 1 ? commandArgs[1] : undefined;
    let canonAddress = await resolveEnsName(canonAddressRaw);

    if (!tgId) {
      await ctx.reply('Could not identify your user ID. Please try again.');
      return null;
    }

    if (!handlerId) {
      await ctx.reply(
        'Could not identify your Telegram username. Please set one and try again.'
      );
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

    console.log('Account setup response:', handlerId);
    const promises: any[] = [];
    // TODO: gate on group
    if (address) {
      // Save the user data to Supabase including the account and optional canon_address
      promises.push(addVillager(address));
      if (canonAddress) {
        console.log('Adding canon address', canonAddress);
        promises.push(addVillager(canonAddress));
      }
      promises.push(saveUserData(handlerId, tgId, address, canonAddress));

      // the blessnet API does not yet support funding new accounts
      // so we do it manually for now, using a pK and a dedicated address
      // in a future version, the above call should do it for us.
      if (message !== 'Account already exists') {
        const signer = new ethers.Wallet(
          process.env.FUNDER_PRIVATE_KEY!,
          config.provider
        );
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
          errors += `Failed to save user data: ${i} ${result.reason}\n`;
        }
        i++;
      }
      let replyMessage = `Your account has been set up successfully!\nHandler ID: ${handlerId}\nAccount: ${address}`;
      if (canonAddress) {
        replyMessage += `\nCanonical Address: ${canonAddress}`;
      }
      // replyMessage += `\n${errors}`;
      await ctx.reply(replyMessage);
    } else {
      console.error('Missing account in response:', response.data);
      await ctx.reply(
        'Your account was created, but we could not identify your account.'
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

commands['addBadge'] = async (ctx: Context) => {
  const [_, ...titles] = ctx.message?.text?.split(' ') || [];
  const title = titles.join(' ');
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

commands['addManager'] = async (ctx: Context) => {
  const me = await getUserByHandler(ctx.from?.username || '');
  if (!me.success) {
    await ctx.reply(
      'You need to set up your account first. Use the /setup command.'
    );
    return;
  }

  const isManager = await hasRole(me.data?.address!, ROLES.MANAGER);
  const isAdmin_ = await isAdmin(ctx);
  if (!isManager && !isAdmin_) {
    await ctx.reply('Only managers can add managers');
    return;
  }

  const mentions = ctx.entities().filter((entity) => entity.type === 'mention');
  if (mentions.length === 0) {
    await ctx.reply('Please mention a user to add as manager');
    return;
  }

  const users = await Promise.all(
    mentions.map(async (mention) => await getUserByHandler(mention.text))
  );
  if (users.some((user) => !user.success)) {
    await ctx.reply('Make sure users have run `/setup` first');
    return;
  }

  try {
    await Promise.all(
      users.map(async (user) =>
        giveAttestation({
          recipient: user.data!.address,
          // we want the abstract account to be a manager, not the canonical one
          attester: me.data!.address!,
          attestationType: 'ATTEST_MANAGER',
          args: [ROLES.MANAGER],
        })
      )
    );

    await ctx.reply('Manager added successfully');
    return;
  } catch (error) {
    console.error('Error adding manager:', error);
    await ctx.reply(error.message || 'Failed to add manager');
    return;
  }
};

/**
 * Return all titles available to the users
 */
commands['badges'] = async (ctx: Context) => {
  const titles = await getTitles();
  await ctx.reply(
    `Available badges are:\n${titles.map((title) => `• ${title}`).join('\n')}`
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
    if (!lastMention) {
      await ctx.reply(
        'Please mention a user to attest. Example: /attest @username title'
      );
      return;
    }
    const postMentionsText = text
      .slice(lastMention.offset + lastMention.length)
      .trim();
    const [title, ...description] = postMentionsText.split(' ');
    const titles = await getTitles();
    if (!titles.includes(title)) {
      await ctx.reply(
        `Title "${title}" not found. Available titles are:\n${titles
          .map((title) => `• ${title}`)
          .join('\n')}`
      );
      return;
    }
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
      if (mentionedUser.success && mentionedUser.data) {
        await attest({
          recipient:
            mentionedUser.data.canonAddress ?? mentionedUser.data.address,
          attester: me.data?.address!,
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
      error.message || 'An error occurred while processing your request.aa'
    );
  }
};

commands['whoami'] = async (ctx: Context) => {
  const handlerId = ctx.from?.username;
  if (!handlerId) {
    await ctx.reply('Could not identify your Telegram username.');
    return;
  }

  const userData = await getUserByHandler(handlerId);

  if (userData.success && userData.data) {
    let message = `Telegram Handle: @${userData.data.handle}\nTelegram ID: ${userData.data.tgId}\nBlessed Account: ${userData.data.address}`;
    if (userData.data.canonAddress) {
      message += `\nCanonical Address: ${userData.data.canonAddress}`;
    }

    // Check if user is admin in the specified group
    const adminStatus = await isAdmin(ctx);
    if (adminStatus === true) {
      message += `\nGroup Status: Administrator`;
    } else if (adminStatus === false) {
      message += `\nGroup Status: Member`;
    } else {
      // adminStatus is null (GROUP_ID not set, user not identifiable, or API error)
      if (!ENV.GROUP_ID) {
        message += `\nGroup Status: GROUP_ID not configured.`;
      } else {
        message += `\nGroup Status: Could not determine.`;
      }
    }

    await ctx.reply(message);
  } else {
    await ctx.reply(
      'User not found. Use the /setup command to set up your account.'
    );
  }
};

// Keep a simple ping command for health checks
