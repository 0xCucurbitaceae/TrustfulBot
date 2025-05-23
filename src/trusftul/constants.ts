import { ethers } from 'ethers';
import ENV from '../lib/env';


export enum ROLES {
  ROOT = '0x79e553c6f53701daa99614646285e66adb98ff0fcc1ef165dd2718e5c873bee6',
  MANAGER = '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
  VILLAGER = '0x7e8ac59880745312f8754f56b69cccc1c6b2112d567ccf50e4e6dc2e39a7c67a'
}

export interface Schemas {
  uid: `0x${string}`;
  schema: string[];
  revocable: boolean;
  allowedRole: string[];
}

export interface BadgeTitle {
  title: string;
  uid: `0x${string}`;
  allowComment: boolean;
  revocable: boolean;
  data: string;
  allowedRole: string[];
}

export const config = {
  resolver: ENV.RESOLVER,
  eas: ENV.EAS,
  provider: new ethers.JsonRpcProvider(ENV.RPC_URL, ENV.CHAIN_ID),
  attestations: {
    ATTEST_MANAGER: {
      uid: ENV.MANAGER_UID,
      schema: ['string'], // role
      revocable: true,
      allowedRole: [ROLES.ROOT],
    },
    ATTEST_VILLAGER: {
      uid: ENV.VILLAGER_UID,
      schema: ['string'], // status
      revocable: false,
      allowedRole: [ROLES.MANAGER],
    },
    ATTEST_EVENT: {
      uid: ENV.EVENT_UID,
      schema: ['string', 'string'], // title, comment
      revocable: false,
      allowedRole: [ROLES.VILLAGER],
    },
    ATTEST_RESPONSE: {
      uid: ENV.RESPONSE_UID,
      schema: ['bool'], // status
      revocable: true,
      allowedRole: [ROLES.VILLAGER],
    },
  },
};
