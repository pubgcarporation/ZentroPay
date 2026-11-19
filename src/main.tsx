import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { Toaster } from 'sonner'
import { config } from '@/config'
import { installShareSync } from '@/lib/share'
import App from '@/App'
import './index.css'

installShareSync()

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          mode="dark"
          customTheme={{
            '--ck-font-family': "'Figtree', sans-serif",
            '--ck-accent-color': '#3b12c8',
            '--ck-accent-text-color': '#ffffff',
          }}
        >
          <App />
          <Toaster position="top-center" theme="dark" />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
