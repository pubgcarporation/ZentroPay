import { useQuery } from '@tanstack/react-query'
import { erc20Abi } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { api } from '@/lib/api'
import { ARC_CHAIN_ID, USDC_ADDRESS } from '@/lib/chain'
import { useSession } from '@/hooks/useSession'
import type { Friend, MoneyRequest, Payment, User } from '@/lib/types'

const REFRESH_MS = 8000

/** Live USDC balance (ERC-20 view; gas on Arc comes from the same pool). */
export function useUsdcBalance() {
  const { address } = useAccount()
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address!],
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address), refetchInterval: REFRESH_MS },
  })
}

export function useFeed(scope: 'friends' | 'you') {
  const { token } = useSession()
  return useQuery({
    queryKey: ['feed', scope, token],
    enabled: Boolean(token),
    refetchInterval: REFRESH_MS,
    queryFn: async () => (await api<{ items: Payment[] }>(`/feed?scope=${scope}`, { token })).items,
  })
}

export function useRequests() {
  const { token } = useSession()
  return useQuery({
    queryKey: ['requests', token],
    enabled: Boolean(token),
    refetchInterval: REFRESH_MS,
    queryFn: async () => (await api<{ items: MoneyRequest[] }>('/requests', { token })).items,
  })
}

export function useFriends() {
  const { token } = useSession()
  return useQuery({
    queryKey: ['friends', token],
    enabled: Boolean(token),
    queryFn: async () => (await api<{ friends: Friend[] }>('/friends', { token })).friends,
  })
}

/** Search registered handles and names; an empty query returns your contacts. */
export function useUserSearch(query: string) {
  const { token } = useSession()
  return useQuery({
    queryKey: ['user-search', query, token],
    enabled: Boolean(token),
    queryFn: async () => (await api<{ users: User[] }>(`/users/search?q=${encodeURIComponent(query)}`, { token })).users,
  })
}
