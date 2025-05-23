import { Context,  } from 'grammy';
import ENV from './env';

/**
 * Checks if the user invoking the command is an administrator or creator of the ENV.GROUP_ID.
 * @param ctx The command context.
 * @returns Promise<boolean | null>: true if admin, false if member, null if GROUP_ID not set, user not found, or error.
 */
export async function isAdmin(ctx: Context): Promise<boolean | null> {
  if (!ENV.GROUP_ID) {
    console.warn('isAdmin check: GROUP_ID not configured in environment.');
    return null;
  }
  if (!ctx.from || !ctx.from.id) {
    console.warn('isAdmin check: Cannot identify user from context.');
    return null;
  }

  try {
    // Make sure to use ctx.api for API calls, not ctx.getChatMember directly if it's not a plugin method
    const chatMember = await ctx.api.getChatMember(ENV.GROUP_ID, ctx.from.id);
    return chatMember.status === 'creator' || chatMember.status === 'administrator';
  } catch (error) {
    console.error(
      `Error checking admin status for user ${ctx.from.id} in group ${ENV.GROUP_ID}:`,
      error
    );
    return null; // Error during API call
  }
}
