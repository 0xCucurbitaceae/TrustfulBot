'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useChains, usePublicClient } from 'wagmi';
import { EASABI } from '../../../abis/EASABI'; // Adjusted path
import ENV from '../../../lib/env'; // Adjusted path
import { Address, Hex } from 'viem';
import Link from 'next/link';

type AttestationDetails = {
  uid: Hex;
  schema: Hex;
  time: bigint;
  expirationTime: bigint;
  revocationTime: bigint;
  refUID: Hex;
  recipient: Address;
  attester: Address;
  revocable: boolean;
  data: Hex;
};

function formatTimestamp(timestamp: bigint): string {
  if (timestamp === 0n) return 'Never';
  return new Date(Number(timestamp) * 1000).toLocaleString();
}

function DetailItem({ label, value, isMono = false, isLink = false, href = '#', target }: { label: string; value: string | React.ReactNode; isMono?: boolean; isLink?: boolean; href?: string, target?: string }) {
  const valueClass = isMono ? 'font-mono' : '';
  const linkHref = isLink ? href : undefined;
  const ValueWrapper = isLink && typeof value === 'string' && linkHref ?
    ({ children }: {children: React.ReactNode}) => <Link href={linkHref} className="text-blue-600 hover:text-blue-800 hover:underline" target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined}>{children}</Link> :
    ({ children }: {children: React.ReactNode}) => <>{children}</>;

  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm text-gray-800 ${valueClass} break-all`}>
        <ValueWrapper>{value}</ValueWrapper>
      </p>
    </div>
  );
}

export default function AttestationDetailPage() {
  const params = useParams();
  const uid = params?.uid as Hex | undefined;
  const publicClient = usePublicClient();
  const chains = useChains();
  const [attestation, setAttestation] = useState<AttestationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setError('Attestation UID not found in URL.');
      setIsLoading(false);
      return;
    }
    if (!publicClient) {
      // Still waiting for publicClient to be available from wagmi
      return;
    }

    async function fetchAttestationDetail() {
      setIsLoading(true);
      setError(null);
      try {
        const attData = await publicClient!.readContract({
          address: ENV.EAS as Address,
          abi: EASABI,
          functionName: 'getAttestation',
          args: [uid!],
        });
        console.log({
          attData,
          eas: ENV.EAS,
          uid,
        });

        console.log(attData)
        setAttestation(attData);
      } catch (e) {
        console.error('Failed to fetch attestation details:', e);
        setError(`Failed to load attestation details for UID: ${uid}. Check console for more info.`);
      }
      setIsLoading(false);
    }

    fetchAttestationDetail();
  }, [publicClient, uid]);

  if (!publicClient && !uid) {
     return <div className="p-6 flex justify-center items-center min-h-screen bg-gray-100"><div className="text-gray-500">Attestation UID not provided or client not ready.</div></div>;
  }
   if (!publicClient && uid) {
    return <div className="p-6 flex justify-center items-center min-h-screen bg-gray-100"><div className="text-gray-500">Connecting to network... Please wait.</div></div>;
  }

  if (isLoading) {
    return <div className="p-6 flex justify-center items-center min-h-screen bg-gray-100"><div className="text-gray-500">Loading attestation details for {uid}...</div></div>;
  }

  if (error) {
    return <div className="p-6 flex justify-center items-center min-h-screen bg-gray-100"><div className="text-red-500 bg-white p-8 rounded-lg shadow-xl">Error: {error}</div></div>;
  }

  if (!attestation) {
    return <div className="p-6 flex justify-center items-center min-h-screen bg-gray-100"><div className="text-gray-600 bg-white p-8 rounded-lg shadow-xl">No attestation data found for UID: {uid}. It might be an invalid UID or a network issue.</div></div>;
  }

  const isRevoked = attestation.revocationTime > 0n && attestation.revocationTime <= BigInt(Math.floor(Date.now() / 1000));
  const chain = chains.find((chain) => chain.id === ENV.CHAIN_ID);
  const explorerBaseUrl = chain?.blockExplorers?.default?.url;
  const schemaExplorerUrl = `https://sepolia.easscan.org/schema/view/${attestation.schema}`; // Example for Sepolia, adjust if needed for other networks

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-xl p-6 md:p-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-6 border-b border-gray-200">
          <div className='mb-4 sm:mb-0'>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Onchain Attestation</h1>
            <DetailItem label="UID" value={attestation.uid} isMono />
          </div>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full
            ${isRevoked ? 'bg-red-100 text-red-700' : (attestation.revocable ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')}`}>
            {isRevoked ? 'Revoked' : (attestation.revocable ? 'Revocable (Active)' : 'Not Revocable')}
          </span>
        </div>

        {/* Main Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 mb-6">
          {/* Left Column (Schema, Decoded Data) */}
          <div className="md:col-span-2 space-y-6">
            {/* Schema Section */}
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500 uppercase tracking-wider">Schema</p>
                    <Link href={schemaExplorerUrl} target="_blank" rel="noopener noreferrer" title="View Schema on EASScan">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 hover:text-indigo-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                        </svg>
                    </Link>
                </div>
                <div className="flex items-center space-x-3">
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md text-sm font-semibold font-mono">
                        {`${attestation.schema.substring(0,8)}...${attestation.schema.substring(attestation.schema.length-6)}`}
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-gray-800 font-mono break-all">
                            {attestation.schema}
                        </p>
                    </div>
                </div>
            </div>

            {/* Decoded Data Section */}
            <div>
              <h2 className="text-sm text-gray-500 uppercase tracking-wider mb-2">Decoded Data</h2>
              <div className="bg-gray-50 p-4 rounded-lg shadow-sm space-y-3">
                <p className="text-xs text-gray-600 font-mono break-all">
                  Raw Data (Hex): {attestation.data}
                </p>
                <p className="text-xs text-gray-500 italic">
                    (Schema-specific decoding not yet implemented. Showing raw hex data.)
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (Timestamps, From/To) */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-2">Timestamps</h3>
              <div className="space-y-2 text-sm">
                <DetailItem label="Created" value={formatTimestamp(attestation.time)} />
                {/* TODO: Add link to transaction using transactionHash if available/fetched for this specific attestation */}
                <p className="text-xs text-gray-500">Timestamp onchain: {formatTimestamp(attestation.time)}</p>
                <DetailItem label="Expiration" value={formatTimestamp(attestation.expirationTime)} />
                <DetailItem label="Revoked" value={isRevoked ? `Yes, at ${formatTimestamp(attestation.revocationTime)}` : (attestation.revocable ? 'No (Still Active)' : 'No (Not Revocable)')} />
              </div>
            </div>
            <div>
              <DetailItem label="From (Attester)" value={`${attestation.attester.substring(0,10)}...${attestation.attester.substring(attestation.attester.length-4)}`} isMono isLink href={`${explorerBaseUrl}/address/${attestation.attester}`} target="_blank" />
              <DetailItem label="To (Recipient)" value={`${attestation.recipient.substring(0,10)}...${attestation.recipient.substring(attestation.recipient.length-4)}`} isMono isLink href={`${explorerBaseUrl}/address/${attestation.recipient}`} target="_blank" />
            </div>
          </div>
        </div>

        {/* Referenced Attestation Section */}
        {attestation.refUID !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-sm text-gray-500 uppercase tracking-wider mb-2">Referenced Attestation</h2>
            <DetailItem label="Reference UID" value={attestation.refUID} isMono isLink href={`/attestations/${attestation.refUID}`} />
          </div>
        )}

        {/* Raw Data Section (Simplified JSON view of onchain data) */}
        <div className="mb-6">
            <h2 className="text-sm text-gray-500 uppercase tracking-wider mb-2">Raw Onchain Attestation Data</h2>
            <pre className="bg-gray-800 text-white p-4 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(
                    {
                        uid: attestation.uid,
                        schema: attestation.schema,
                        time: attestation.time.toString(),
                        expirationTime: attestation.expirationTime.toString(),
                        revocationTime: attestation.revocationTime.toString(),
                        refUID: attestation.refUID,
                        recipient: attestation.recipient,
                        attester: attestation.attester,
                        revocable: attestation.revocable,
                        data: attestation.data,
                    },
                    null,
                    2
                )}
            </pre>
        </div>

        {/* Action Buttons (UI only, functionality not implemented) */}
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            Download (UI)
          </button>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
            Offline Link (UI)
          </button>
        </div>
      </div>
    </div>
  );
}