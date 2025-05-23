# Blessed Bot

A Telegram bot for the Blessnet platform that handles user setup and attestations.

## Contents of the hackaton

- [updated Trustful resolvers to automatically set up on construction](https://github.com/blockful-io/trustful-zuzalu-contracts/pull/24)
- [added a ResolverFactory](https://github.com/blockful-io/trustful-zuzalu-contracts/pull/25)
- Created a bot that handles user interactions with EAS, the trustful way
- made it some-clicks deployable to spin up your own bot

## TODO:

**misc**

- [] allow delegate votes

**tg**

- [x] gate on groupID
- [x] prevent non-managers to addTitles
- [] allow managers to disable titles
- [] vote on new titles?
- [] react on an attestation to confirm it
- [] support disabling titles
- [] attest of an address mapping when sending a canonical address

**resolver**

- [] accept array of schemas to set all schemas at once
- [] handle groups

**deploy**

- [] automatically migrate supabase on deploy
- [] allow for groupId to be set later

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
