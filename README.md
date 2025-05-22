# Blessed Bot

A Telegram bot for the Blessnet platform that handles user setup and attestations.

# SETUP

1. Deploy trustful's resolver
2. Register the 4 trustful schemas
3. update the UIDs in the env
4. Get a bless.net API account
5. Make your blessnet account a manager on the resolver
6. Fund your blessnet account with enough to fund each potential accounts
7. Create a tg group
8. run `/whoamigroup` to get the group ID
9. set `GROUP_ID` in the env
10. deploy your app
11. Set the webhook with `pnpm set-webhook`

## TODO:

- [] gate on groupID
- [] prevent non-managers to addTitles
- [] vote on new titles?
- [] react on an attestation to confirm it
- []

## Supabase Setup

This project uses Supabase for storing handler-userId mappings. Follow these steps to set up your Supabase database:

1. Create a Supabase project at [https://app.supabase.com/](https://app.supabase.com/)
2. Get your Supabase URL and anon key from the project settings
3. Add the following environment variables to your `.env` file:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run the migration script in the Supabase SQL editor:
   - Go to the SQL Editor in your Supabase dashboard
   - Copy the contents of `scripts/supabase-migration.sql`
   - Paste and run the SQL in the editor

## Environment Variables

The following environment variables are required:

- `BOT_TOKEN`: Your Telegram bot token
- `WEBHOOK_HOST`: Your webhook host (e.g., your-app.vercel.app)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `BLESSNET_SCAN_API_KEY`: Your Blessnet API key

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Set webhook
pnpm set-webhook

# Build for production
pnpm build
```
