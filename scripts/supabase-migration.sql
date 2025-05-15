-- Create the users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  handle TEXT NOT NULL,
  user_id TEXT NOT NULL,
  account TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Add unique constraint to prevent duplicates
  UNIQUE(handle, platform)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_account ON users(account);
CREATE INDEX IF NOT EXISTS idx_users_platform ON users(platform);

-- Add comment to the table
COMMENT ON TABLE users IS 'Stores user information including handler IDs, user IDs, and accounts for the Blessed Bot';
