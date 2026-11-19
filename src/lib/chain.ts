import { arcTestnet } from 'viem/chains'
import type { Address } from 'viem'

/** Arc Testnet, chain ID 5042002 (https://docs.arc.io). */
export const ARC_CHAIN_ID = 5042002 as const
export const ARC_RPC_URL = 'https://rpc.testnet.arc.io'
export const ARC_EXPLORER_URL = 'https://explorer.testnet.arc.io'
export { arcTestnet }

/** USDC ERC-20 predeploy on Arc (6 decimals in the ERC-20 view). */
export const USDC_ADDRESS: Address = '0x3600000000000000000000000000000000000000'
export const USDC_DECIMALS = 6

export const txUrl = (hash: string) => `${ARC_EXPLORER_URL}/tx/${hash}`
export const addressUrl = (addr: string) => `${ARC_EXPLORER_URL}/address/${addr}`
