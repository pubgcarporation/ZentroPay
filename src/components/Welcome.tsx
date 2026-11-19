import { ConnectKitButton } from 'connectkit'
import { PenLine } from 'lucide-react'
import { PrimaryButton, Screen, Spinner } from '@/components/ui'
import { useSession } from '@/hooks/useSession'

/** Shown until a wallet is connected and signed in. */
export function Welcome() {
  const { status, signIn, signingIn, signOut } = useSession()
  const connected = status !== 'disconnected'

  return (
    <Screen className="justify-between pb-10 pt-16">
      <div>
        <h1 className="display text-[40px] font-bold leading-[1.05]">
          Pay anyone by
          <br />
          @handle
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: 'var(--muted)' }}>
          No account numbers. No addresses. Send USDC to friends on Arc in seconds.
        </p>
      </div>

      <div className="space-y-3">
        {!connected ? (
          <ConnectKitButton.Custom>
            {({ show }) => <PrimaryButton onClick={show}>Connect wallet</PrimaryButton>}
          </ConnectKitButton.Custom>
        ) : (
          <>
            <p className="flex items-start gap-2 text-sm" style={{ color: 'var(--muted)' }}>
              <PenLine className="mt-0.5 size-4 shrink-0" />
              Sign a free message to prove this wallet is yours. No transaction is sent.
            </p>
            <PrimaryButton onClick={signIn} disabled={signingIn || status === 'loading'}>
              {signingIn || status === 'loading' ? <Spinner /> : 'Sign in'}
            </PrimaryButton>
            <button onClick={signOut} className="min-h-11 w-full text-sm" style={{ color: 'var(--muted)' }}>
              Use a different wallet
            </button>
          </>
        )}
      </div>
    </Screen>
  )
}
