const CHAIN_ID =
  process.env.VERCEL_ENV === 'production'
    ? 'sepolia' // TODO: mainnet address
    : 'sepolia';

const getAbstractAccount = async (userId: string, platform: string) => {
  try {
    const response = await fetch(
      `https://api.bless.net/aa-account?platform=${platform}&chain=${CHAIN_ID}&userId=${userId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.BLESSNET_SCAN_API_KEY!,
        },
      }
    );

    return (await response.json()) as {
      account: string;
      exists: boolean;
      hashedId: string;
    };
  } catch (error) {
    console.error('Error getting abstract account:', error);
    throw error;
  }
};

export { getAbstractAccount };
