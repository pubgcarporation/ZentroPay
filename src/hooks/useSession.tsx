import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAccount, useDisconnect, useSignMessage } from 'wagmi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, api, clearToken, getToken, setToken } from '@/lib/api'
import { parseOnchainError } from '@/lib/format'
import type { User } from '@/lib/types'

export type SessionStatus = 'disconnected' | 'signed-out' | 'loading' | 'needs-handle' | 'ready'

interface Session {
  status: SessionStatus
  address?: `0x${string}`
  token?: string
  me?: User
  signingIn: boolean
  signIn: () => Promise<void>
  signOut: () => void
  /** Called after the user claims a handle. */
  setMe: (user: User) => void
}

const SessionContext = createContext<Session | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const queryClient = useQueryClient()
  const [token, setTokenState] = useState<string | undefined>()
  const [signingIn, setSigningIn] = useState(false)

  // Load the saved session for the connected wallet; drop it when the wallet changes.
  useEffect(() => {
    queryClient.clear()
    setTokenState(address ? getToken(address) : undefined)
  }, [address, queryClient])

  const meQuery = useQuery({
    queryKey: ['me', address, token],
    enabled: Boolean(address && token),
    retry: false,
    queryFn: async () => {
      try {
        return (await api<{ user: User }>('/me', { token })).user
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        if (error instanceof ApiError && error.status === 401 && address) {
          clearToken(address)
          setTokenState(undefined)
        }
        throw error
      }
    },
  })

  const signIn = useCallback(async () => {
    if (!address) return
    setSigningIn(true)
    try {
      const { message } = await api<{ message: string }>('/auth/nonce', { body: { address } })
      const signature = await signMessageAsync({ message })
      const result = await api<{ token: string }>('/auth/verify', { body: { address, signature } })
      setToken(address, result.token)
      setTokenState(result.token)
    } catch (error) {
      const message = error instanceof ApiError ? error.message : parseOnchainError(error)
      if (message) toast.error(message)
    } finally {
      setSigningIn(false)
    }
  }, [address, signMessageAsync])

  const signOut = useCallback(() => {
    if (address) clearToken(address)
    setTokenState(undefined)
    queryClient.clear()
    disconnect()
  }, [address, disconnect, queryClient])

  const setMe = useCallback(
    (user: User) => queryClient.setQueryData(['me', address, token], user),
    [address, queryClient, token],
  )

  const me = meQuery.data ?? undefined
  const status: SessionStatus = !isConnected || !address
    ? 'disconnected'
    : !token
      ? 'signed-out'
      : meQuery.isLoading
        ? 'loading'
        : me
          ? 'ready'
          : meQuery.data === null
            ? 'needs-handle'
            : 'signed-out'

  const value = useMemo<Session>(
    () => ({ status, address, token, me, signingIn, signIn, signOut, setMe }),
    [status, address, token, me, signingIn, signIn, signOut, setMe],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): Session {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
