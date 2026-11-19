import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { buildShareLink } from '@/lib/share'
import { FriendsTab } from '@/components/FriendsTab'
import { HandleTab } from '@/components/HandleTab'
import { Home } from '@/components/Home'
import { Onboarding } from '@/components/Onboarding'
import { PayFlow, type FlowStart } from '@/components/PayFlow'
import { PaymentsTab } from '@/components/PaymentsTab'
import { TabBar, type Tab } from '@/components/TabBar'
import { Welcome } from '@/components/Welcome'
import { Screen, Spinner } from '@/components/ui'
import { SessionProvider, useSession } from '@/hooks/useSession'
import type { User } from '@/lib/types'

const FAUCET_URL = 'https://faucet.circle.com'

export default function App() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  )
}

function Gate() {
  const { status } = useSession()
  if (status === 'loading') {
    return <Screen className="items-center justify-center"><Spinner className="size-7" /></Screen>
  }
  if (status === 'disconnected' || status === 'signed-out') return <Welcome />
  if (status === 'needs-handle') return <Onboarding />
  return <Main />
}

function Main() {
  const { me, token } = useSession()
  const [tab, setTab] = useState<Tab>('home')
  const [flow, setFlow] = useState<FlowStart | undefined>()
  const [shareLink, setShareLink] = useState<string>()

  // Pay link: /?pay=handle opens the pay screen for that person.
  useEffect(() => {
    const handle = new URLSearchParams(window.location.search).get('pay')
    if (!handle || !token) return
    api<{ user: User }>(`/users/${encodeURIComponent(handle)}`, { token })
      .then(({ user }) => {
        if (user.address !== me?.address) setFlow({ mode: 'pay', user })
        window.history.replaceState({}, '', window.location.pathname)
      })
      .catch(() => toast.error(`No one has the handle @${handle}.`))
  }, [token, me?.address])

  // Resolve the share base once, so copy works on the first tap.
  useEffect(() => {
    if (!me) return
    let live = true
    buildShareLink(`/?pay=${me.handle}`).then((url) => live && setShareLink(url))
    return () => { live = false }
  }, [me])

  async function share() {
    if (!shareLink) return
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Pay me on ZentroPay', url: shareLink })
        return
      } catch {
        // Cancelled or unsupported: fall through to copy.
      }
    }
    await navigator.clipboard.writeText(shareLink)
    toast.success('Pay link copied.')
  }

  const addMoney = () => window.open(FAUCET_URL, '_blank', 'noopener,noreferrer')

  if (flow) {
    return (
      <Screen>
        <PayFlow start={flow} onClose={() => setFlow(undefined)} />
      </Screen>
    )
  }

  return (
    <>
      <Screen className="pb-24">
        {tab === 'home' && (
          <Home
            onPay={() => setFlow({ mode: 'pay' })}
            onRequest={() => setFlow({ mode: 'request' })}
            onAddMoney={addMoney}
            onShare={share}
            onProfile={() => setTab('handle')}
          />
        )}
        {tab === 'friends' && <FriendsTab onStart={setFlow} />}
        {tab === 'payments' && <PaymentsTab onStart={setFlow} />}
        {tab === 'handle' && <HandleTab onAddMoney={addMoney} onShare={share} />}
      </Screen>
      <TabBar tab={tab} onChange={setTab} />
    </>
  )
}
