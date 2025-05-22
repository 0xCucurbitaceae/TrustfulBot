'use client';

import { useEffect, useMemo, useState } from 'react';
import { Log } from 'viem';
import { EASABI } from '../abis/EASABI';
import ENV from '../lib/env';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { usePublicClient } from 'wagmi';

type Attestation = {
  recipient: string;
  attester: string;
  uid: string;
  schemaUID: string;
  blockNumber: bigint;
  transactionHash: string; // Keep for potential linking, though not a primary column now
};

const columnHelper = createColumnHelper<Attestation>();

// Columns based on the screenshot: UID, Schema, From, To, Type, Age
const columns = [
  columnHelper.accessor('uid', {
    header: () => <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">UID</span>,
    cell: (info) => {
      const uid = info.getValue();
      return <span className="text-sm text-gray-700 font-mono">{`${uid.substring(0, 8)}...${uid.substring(uid.length - 6)}`}</span>;
    }
  }),
  columnHelper.accessor('schemaUID', {
    header: () => <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Schema</span>,
    cell: (info) => {
      const schemaUID = info.getValue();
      // TODO: Fetch schema name/details for richer display like in the screenshot (e.g., "#179 WITNESSED ATTESTATIONS")
      return <span className="text-sm text-gray-700 font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">{`${schemaUID.substring(0, 6)}...${schemaUID.substring(schemaUID.length - 4)}`}</span>;
    }
  }),
  columnHelper.accessor('attester', {
    header: () => <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">From</span>,
    cell: (info) => {
        const attester = info.getValue();
        // TODO: Link to explorer for address
        return <span className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">{`${attester.substring(0, 6)}...${attester.substring(attester.length - 4)}`}</span>;
    }
  }),
  columnHelper.accessor('recipient', {
    header: () => <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">To</span>,
    cell: (info) => {
        const recipient = info.getValue();
        // TODO: Link to explorer for address
        return <span className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">{`${recipient.substring(0, 6)}...${recipient.substring(recipient.length - 4)}`}</span>;
    }
  }),
  columnHelper.display({
    id: 'type',
    header: () => <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</span>,
    cell: () => <span className="text-sm text-gray-700">ONCHAIN</span>, // As these are from on-chain events
  }),
  columnHelper.accessor('blockNumber', {
    header: () => <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Age</span>,
    // TODO: Convert blockNumber to relative time (e.g., "9 hours ago") by fetching block timestamp
    cell: (info) => <span className="text-sm text-gray-700">Block {info.getValue().toString()}</span>,
  }),
];


export default function AttestationsTable() {
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!publicClient) return;
    async function fetchAttestations() {
      setIsLoading(true);
      setError(null);
      try {
        const logs: Log[] = await publicClient.getLogs({
          address: ENV.EAS as `0x${string}`,
          // @ts-ignore TODO: fix this type, it's an ABI type from viem
          event: EASABI.find((item) => item.name === 'Attested' && item.type === 'event'),
          fromBlock: 'earliest', // Consider fetching only recent blocks for performance on mainnets
          toBlock: 'latest',
        });
        console.log(ENV.EAS, logs);

        const parsedAttestations = logs.map((log) => {
          const args = log.args as unknown as { recipient: string; attester: string; uid: string; schemaUID: string };
          return {
            recipient: args.recipient,
            attester: args.attester,
            uid: args.uid,
            schemaUID: args.schemaUID,
            blockNumber: log.blockNumber!,
            transactionHash: log.transactionHash!, // Keep for potential future use (e.g., linking UID to tx)
          };
        });

        setAttestations(parsedAttestations.sort((a,b) => Number(b.blockNumber) - Number(a.blockNumber)));
      } catch (e) {
        console.error('Failed to fetch attestations:', e);
        setError('Failed to load attestations. See console for details.');
      }
      setIsLoading(false);
    }

    fetchAttestations();
  }, [publicClient]);

  const table = useReactTable({
    data: attestations,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const stats = useMemo(() => {
    const totalAttestations = attestations.length;
    const uniqueSchemas = new Set(attestations.map(a => a.schemaUID)).size;
    const uniqueAttesters = new Set(attestations.map(a => a.attester)).size;
    return { totalAttestations, uniqueSchemas, uniqueAttesters };
  }, [attestations]);

  if (!publicClient) {
    return <div className="p-4 flex justify-center items-center min-h-screen bg-gray-100"><div className="text-gray-500">Connecting to network...</div></div>;
  }

  if (isLoading) {
    return <div className="p-4 flex justify-center items-center min-h-screen bg-gray-100"><div className="text-gray-500">Loading attestations...</div></div>;
  }

  if (error) {
    return <div className="p-4 flex justify-center items-center min-h-screen bg-gray-100"><div className="text-red-500 bg-white p-6 rounded-lg shadow-md">Error: {error}</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
              <p className="text-sm text-gray-500">Showing the most recent EAS activity.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4 md:mt-0 text-center md:text-right">
              <div>
                <p className="text-3xl font-bold text-gray-800">{stats.totalAttestations}</p>
                <p className="text-xs text-gray-500 uppercase">Total Attestations</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-800">{stats.uniqueSchemas}</p>
                <p className="text-xs text-gray-500 uppercase">Total Schemas</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-800">{stats.uniqueAttesters}</p>
                <p className="text-xs text-gray-500 uppercase">Unique Attestors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Attestations Table */}
        {attestations.length === 0 ? (
          <div className="bg-white shadow-lg rounded-xl p-6 text-center text-gray-500">
            No attestations found.
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors duration-150">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
