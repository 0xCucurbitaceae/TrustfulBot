# Blessed Bot

A Telegram bot for the Blessnet platform that handles user setup and attestations.

# SETUP

## Only new resolver

1. download the resolver from the trustful repo
2. deploy it
3. register the schemas
4. set the blessed bot as manager

## From Scratch
1. Deploy EAS and SchemaRegistry
2. Deploy trustful's resolver
3. Register the 4 trustful schemas
4. update the UIDs in the env
5. Get a bless.net API account
6. Make your blessnet account a manager on the resolver
7. Fund your blessnet account with enough to fund each potential accounts
8. Create a tg group
9. run `/whoamigroup` to get the group ID
10. set `GROUP_ID` in the env
11. deploy your app
12. Set the webhook with `pnpm set-webhook`

## TODO:


### tg

- [x] gate on groupID
- [x] prevent non-managers to addTitles
- [] allow managers to disable titles
- [] vote on new titles?
- [] react on an attestation to confirm it
- [] support disabling titles

### resolver

- [] accept array of schemas to set all schemas at once
- [] handle groups

### deploy

- [] migrate supabase on deploy

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
