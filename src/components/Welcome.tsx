import { ConnectKitButton } from 'connectkit'
import { PenLine } from 'lucide-react'
import { PrimaryButton, Screen, Spinner } from '@/components/ui'
import { useSession } from '@/hooks/useSession'

/** Purple welcome screen, shown until a wallet is connected and signed in. */
export function Welcome() {
  const { status, signIn, signingIn, signOut } = useSession()
  const connected = status !== 'disconnected'

  return (
    <Screen tone="brand" className="justify-between pb-10 pt-24">
      <div className="fade">
        <p className="text-[17px] font-semibold text-white/80">ZentroPay</p>
        <h1 className="display mt-3 text-[44px] font-extrabold leading-[1.04]">
          Pay your friends
          <br />
          by @handle
        </h1>
        <p className="mt-4 max-w-[19rem] text-[17px] leading-snug text-white/75">
          No more copying wallet addresses. Send USDC in seconds on Arc, for under a cent.
        </p>
      </div>

      <div className="space-y-3">
        {!connected ? (
          <ConnectKitButton.Custom>
            {({ show }) => <PrimaryButton onClick={show}>Connect wallet</PrimaryButton>}
          </ConnectKitButton.Custom>
        ) : (
          <>
            <p className="flex items-start gap-2 text-sm text-white/75">
              <PenLine className="mt-0.5 size-4 shrink-0" />
              Sign a free message to prove this wallet is yours. No transaction is sent.
            </p>
            <PrimaryButton onClick={signIn} busy={signingIn || status === 'loading'}>
              {signingIn || status === 'loading' ? <Spinner /> : 'Sign in'}
            </PrimaryButton>
            <button onClick={signOut} className="h-11 w-full text-sm text-white/70">Use a different wallet</button>
          </>
        )}
      </div>
    </Screen>
  )
}
