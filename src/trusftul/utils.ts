import { ethers, ZeroHash } from 'ethers';
import { EASABI } from '../lib/EASABI';
import { TrustfulResolverABI } from '../lib/TrustfulResolverABI';
import { sendOp } from '../send-op';
import { config, type ROLES } from './constants';

export const getResolverContract = () =>
  new ethers.Contract(config.resolver, TrustfulResolverABI, config.provider);
interface AttestationRequest {
  schema: string;
  data: AttestationRequestData;
}
interface AttestationRequestData {
  recipient: string; // The recipient of the attestation.
  expirationTime: number; // The time when the attestation expires (Unix timestamp).
  revocable: boolean; // Whether the attestation is revocable.
  refUID: string; // The UID of the related attestation.
  data: string; // Custom attestation data.
  value: number; // An explicit ETH amount to send to the resolver. This is important to prevent accidental user errors.
}

export const hasRole = async (address: string, role: ROLES) => {
  const contract = getResolverContract();
  return contract.hasRole(role, address);
};
/**
 * This sends forms and sends a request to create an attestation
 */

export const giveAttestation = async ({
  recipient,
  attester,
  attestationType,
  args,
}: {
  recipient: string;
  attester: string;
  attestationType: keyof typeof config.attestations;
  args: any[];
}) => {
  const { uid, schema } = config.attestations[attestationType];
  const data = ethers.AbiCoder.defaultAbiCoder().encode(schema, args);
  const attestData: AttestationRequestData = {
    expirationTime: 0,
    refUID: ZeroHash,
    recipient,
    revocable: false,
    data,
    value: 0,
  };

  const attestationRequest: AttestationRequest = {
    schema: uid,
    data: attestData,
  };

  console.log(attestationRequest);

  await sendOp([
    {
      target: config.eas,
      abi: EASABI,
      functionName: 'attest',
      account: attester,
      args: [attestationRequest],
    },
  ]);
};
