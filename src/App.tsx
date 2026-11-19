import { useMemo, useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { ZENTROPAY_ADDRESS, addressUrl } from '@/lib/chain'
import { useInvoiceIds, useInvoiceRows } from '@/hooks/useInvoices'
import { useInvoiceActions } from '@/hooks/useInvoiceActions'
import { BalanceCard } from '@/components/BalanceCard'
import { CreateInvoice } from '@/components/CreateInvoice'
import { InvoiceList } from '@/components/InvoiceList'
import { STATUS } from '@/lib/abi'

type Tab = 'receive' | 'pay'

function linkedId(): bigint | undefined {
  const raw = new URLSearchParams(window.location.search).get('pay')
  return raw && /^\d+$/.test(raw) ? BigInt(raw) : undefined
}

export default function App() {
  const { address } = useAccount()
  const [tab, setTab] = useState<Tab>('receive')
  const actions = useInvoiceActions()
  const { receivableIds, payableIds, isLoading } = useInvoiceIds(address)
  const linked = useMemo(linkedId, [])

  const receive = useInvoiceRows(receivableIds)
  const pay = useInvoiceRows(payableIds)
  const shared = useInvoiceRows(linked !== undefined ? [linked] : [])

  const sum = (rows: typeof receive.rows) =>
    rows.filter((r) => r.invoice.status === STATUS.Open).reduce((t, r) => t + r.invoice.amount, 0n)

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-16 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="display text-2xl font-bold">ZentroPay</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>USDC invoices on Arc Testnet</p>
        </div>
        <ConnectKitButton />
      </header>

      {!ZENTROPAY_ADDRESS && (
        <p className="glass-card mb-4 rounded-2xl p-4 text-sm" style={{ color: 'var(--danger)' }}>
          The ZentroPay contract address is not configured yet.
        </p>
      )}

      <div className="space-y-4">
        {linked !== undefined && shared.rows.length > 0 && (
          <div>
            <h2 className="display mb-2 text-sm font-semibold">Shared with you</h2>
            <InvoiceList rows={shared.rows} actions={actions} empty="" />
          </div>
        )}

        <BalanceCard receivable={sum(receive.rows)} payable={sum(pay.rows)} />
        <CreateInvoice step={actions.step} busy={actions.busy} onCreate={actions.create} />

        <div role="tablist" className="glass-inner flex rounded-2xl p-1">
          {([['receive', 'To receive'], ['pay', 'To pay']] as const).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className="min-h-10 flex-1 rounded-xl text-sm font-semibold transition-colors"
              style={tab === key ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--muted)' }}
            >
              {label}
            </button>
          ))}
        </div>

        {!address ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--muted)' }}>Connect a wallet to see your invoices.</p>
        ) : isLoading ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading invoices…</p>
        ) : tab === 'receive' ? (
          <InvoiceList rows={receive.rows} actions={actions} empty="No invoices yet. Create one above and share the link." />
        ) : (
          <InvoiceList rows={pay.rows} actions={actions} empty="Nothing to pay. Invoices that name your wallet appear here." />
        )}
      </div>

      {ZENTROPAY_ADDRESS && (
        <footer className="mt-8 text-center text-xs" style={{ color: 'var(--subtle)' }}>
          <a href={addressUrl(ZENTROPAY_ADDRESS)} target="_blank" rel="noreferrer" className="hover:underline">View contract on explorer</a>
        </footer>
      )}
    </div>
  )
}
