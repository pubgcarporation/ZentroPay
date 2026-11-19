import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { arcTestnet, ARC_RPC_URL } from '@/lib/chain'

export const config = createConfig({
  chains: [arcTestnet],
  connectors: [injected()],
  transports: { [arcTestnet.id]: http(ARC_RPC_URL) },
})
