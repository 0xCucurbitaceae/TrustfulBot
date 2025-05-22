import dotenv from 'dotenv';
import { getResolverContract, giveAttestation } from './utils';
import { ROLES } from './constants';

dotenv.config();

/**
 * Adds a villager attestation to a recipient
 * @param recipient The recipient's ID
 */
export const addVillager = async (recipient: string) => {
  console.log('Adding villager', recipient);
  const contract = getResolverContract();
  const isVillager = await contract.hasRole(ROLES.VILLAGER, recipient);
  if (isVillager) {
    console.log('Already a villager');
    return {
      success: false,
      message: 'User is already a villager',
    };
  }
  await giveAttestation({
    recipient,
    attester: process.env.BLESSNET_API_ACCOUNT!,
    attestationType: 'ATTEST_VILLAGER',
    args: ['Check-in'],
  });
};

export const attest = async ({
  recipient,
  attester,
  title,
  comment = 'NO_COMMENT',
}: {
  recipient: string;
  attester: string;
  title: string;
  comment: string;
}) => {
  const titles = await getTitles();
  if (!titles.includes(title)) {
    throw new Error('Title not found');
  }
  await giveAttestation({
    recipient,
    attester,
    attestationType: 'ATTEST_EVENT',
    args: [title, comment],
  });
};

/**
 * Return all titles available to the users
 */
export const getTitles = async () => {
  const contract = getResolverContract();
  const titles = await contract.getAllAttestationTitles();
  return titles;
};
