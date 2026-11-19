import { useState } from 'react'
import { erc20Abi } from 'viem'
import { AlertTriangle, ArrowLeft, Globe, Lock, Zap, Users } from 'lucide-react'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, api } from '@/lib/api'
import { ARC_CHAIN_ID, USDC_ADDRESS } from '@/lib/chain'
import { formatFee, formatUsdc, parseOnchainError, parseUsdc } from '@/lib/format'
import { Avatar, PrimaryButton, Row, Spinner } from '@/components/ui'
import { PaySuccess, type PayResult } from '@/components/PaySuccess'
import { RecipientPicker } from '@/components/RecipientPicker'
import { useFriends, useUsdcBalance } from '@/hooks/useApiQueries'
import { useSession } from '@/hooks/useSession'
import type { Payment, User, Visibility } from '@/lib/types'

export interface FlowStart {
  mode: 'pay' | 'request'
  user?: User
  /** USDC base units, when paying a known request. */
  amount?: bigint
  note?: string
  requestId?: number
}

const VISIBILITY: { key: Visibility; label: string; icon: typeof Globe }[] = [
  { key: 'public', label: 'Public', icon: Globe },
  { key: 'friends', label: 'Friends', icon: Users },
  { key: 'private', label: 'Only us', icon: Lock },
]

const amountText = (raw?: bigint) => (raw === undefined ? '' : (Number(raw) / 1e6).toString())

export function PayFlow({ start, onClose }: { start: FlowStart; onClose: () => void }) {
  const { token } = useSession()
  const { address, chainId } = useAccount()
  const client = usePublicClient({ chainId: ARC_CHAIN_ID })
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const queryClient = useQueryClient()
  const balance = useUsdcBalance()
  const friends = useFriends()

  const [user, setUser] = useState<User | undefined>(start.user)
  const [amountStr, setAmountStr] = useState(amountText(start.amount))
  const [note, setNote] = useState(start.note ?? '')
  const [visibility, setVisibility] = useState<Visibility>('friends')
  const [busy, setBusy] = useState<'idle' | 'switching' | 'signing' | 'confirming' | 'saving'>('idle')
  const [result, setResult] = useState<PayResult | undefined>()
  const [requestSent, setRequestSent] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const isPay = start.mode === 'pay'
  const amount = parseUsdc(amountStr)
  const insufficient = isPay && amount !== undefined && balance.data !== undefined && amount > balance.data
  const firstTime = isPay && user !== undefined && friends.data !== undefined && !friends.data.some((f) => f.address === user.address)

  const fee = useQuery({
    queryKey: ['fee-estimate', address, user?.address],
    enabled: isPay && Boolean(client && address && user),
    staleTime: 15_000,
    queryFn: async () => {
      if (!client || !address || !user) return undefined
      const [gas, price] = await Promise.all([
        client.estimateContractGas({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'transfer', args: [user.address, 1n], account: address }),
        client.getGasPrice(),
      ])
      return formatFee(gas, price)
    },
  })

  if (!user) return <RecipientPicker title={isPay ? 'Who are you paying?' : 'Who are you requesting from?'} onPick={setUser} onClose={onClose} />

  const savePayment = (hash: `0x${string}`) =>
    api<{ payment: Payment }>('/payments', { token, body: { txHash: hash, note: note.trim(), visibility, requestId: start.requestId } })

  async function pay() {
    if (!client || !address || !user || amount === undefined) return
    const started = performance.now()
    try {
      if (chainId !== ARC_CHAIN_ID) {
        setBusy('switching')
        await switchChainAsync({ chainId: ARC_CHAIN_ID })
      }
      setBusy('signing')
      const hash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [user.address, amount],
        chainId: ARC_CHAIN_ID,
      })
      setBusy('confirming')
      const receipt = await client.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') throw new Error('Transaction reverted')
      const seconds = (performance.now() - started) / 1000
      const base: PayResult = {
        hash, amount, to: user, note: note.trim(), visibility, seconds,
        fee: formatFee(receipt.gasUsed, receipt.effectiveGasPrice),
      }
      setBusy('saving')
      try {
        setResult({ ...base, payment: (await savePayment(hash)).payment })
      } catch (error) {
        setResult({ ...base, recordError: error instanceof ApiError ? error.message : 'Could not reach the server.' })
      }
      void queryClient.invalidateQueries()
    } catch (error) {
      const message = parseOnchainError(error)
      if (message) toast.error(message)
    } finally {
      setBusy('idle')
    }
  }

  async function retrySave() {
    if (!result) return
    setRetrying(true)
    try {
      const { payment } = await savePayment(result.hash)
      setResult({ ...result, payment, recordError: undefined })
      void queryClient.invalidateQueries()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not reach the server.')
    } finally {
      setRetrying(false)
    }
  }

  async function sendRequest() {
    if (!user || amount === undefined) return
    setBusy('saving')
    try {
      await api('/requests', { token, body: { toHandle: user.handle, amount: amount.toString(), note: note.trim() } })
      void queryClient.invalidateQueries({ queryKey: ['requests'] })
      setRequestSent(true)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not send the request.')
    } finally {
      setBusy('idle')
    }
  }

  if (result) return <PaySuccess result={result} retrying={retrying} onRetry={retrySave} onDone={onClose} />
  if (requestSent && amount !== undefined) {
    return (
      <div className="flex min-h-dvh flex-col items-center pb-8 pt-24 text-center">
        <div className="pop grid size-20 place-items-center rounded-full bg-[var(--success)] text-black text-3xl font-bold">✓</div>
        <p className="mt-5 text-[15px]" style={{ color: 'var(--muted)' }}>Request sent to @{user.handle}</p>
        <p className="display mt-1 text-[48px] font-bold tabular-nums">{formatUsdc(amount)}</p>
        <p className="mt-2 max-w-xs text-sm" style={{ color: 'var(--muted)' }}>They will see it under Payments and can pay you in one tap.</p>
        <div className="mt-auto w-full pt-6"><PrimaryButton onClick={onClose}>Done</PrimaryButton></div>
      </div>
    )
  }

  const working = busy !== 'idle'
  const cta = busy === 'switching' ? 'Switching network…' : busy === 'signing' ? 'Confirm in wallet…' : busy === 'confirming' ? 'Confirming on Arc…' : busy === 'saving' ? 'Saving…' : null
  const label = isPay ? (amount ? `Pay ${formatUsdc(amount)}` : 'Enter an amount') : amount ? `Request ${formatUsdc(amount)}` : 'Enter an amount'

  return (
    <div className="flex min-h-dvh flex-col pb-6 pt-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setUser(undefined)} disabled={working} aria-label="Change recipient" className="grid size-11 place-items-center rounded-full surface-2"><ArrowLeft className="size-5" /></button>
        <div className="flex items-center gap-2 rounded-full surface-2 py-1.5 pl-1.5 pr-4">
          <Avatar name={user.name} seed={user.handle} size={28} />
          <span className="text-sm font-semibold">@{user.handle}</span>
          {user.city && <span className="text-xs" style={{ color: 'var(--muted)' }}>{user.city}</span>}
        </div>
        <span className="size-11" />
      </div>

      <div className="mt-10 flex flex-col items-center">
        <div className="display flex items-baseline text-[56px] font-bold leading-none">
          <span className="text-white/60">$</span>
          <input
            autoFocus={!start.amount}
            inputMode="decimal"
            value={amountStr}
            readOnly={start.amount !== undefined}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, '')
              if (/^\d{0,9}(\.\d{0,2})?$/.test(v)) setAmountStr(v)
            }}
            placeholder="0"
            aria-label="Amount in USDC"
            size={Math.max(amountStr.length, 1)}
            className="min-w-[1ch] bg-transparent text-center tabular-nums"
          />
        </div>
        {isPay && (
          <p className="mt-3 text-sm tabular-nums" style={{ color: insufficient ? 'var(--danger)' : 'var(--muted)' }}>
            {insufficient ? 'Not enough USDC' : `${balance.data === undefined ? '…' : formatUsdc(balance.data)} available`}
          </p>
        )}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={100}
        readOnly={start.note !== undefined && start.requestId !== undefined}
        placeholder="What's it for?"
        aria-label="What's it for?"
        className="mt-8 min-h-12 w-full rounded-full surface-2 px-5 text-[15px]"
      />

      {isPay && (
        <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Who can see this">
          {VISIBILITY.map(({ key, label: text, icon: Icon }) => (
            <button
              key={key}
              role="radio"
              aria-checked={visibility === key}
              onClick={() => setVisibility(key)}
              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors"
              style={visibility === key ? { background: '#fff', color: '#000' } : { background: 'var(--surface-2)', color: 'var(--muted)' }}
            >
              <Icon className="size-4" /> {text}
            </button>
          ))}
        </div>
      )}

      <div className="mt-auto space-y-3 pt-6">
        {isPay && amount !== undefined && (
          <div className="overflow-hidden rounded-2xl surface">
            <Row label={`@${user.handle} gets`}>{formatUsdc(amount)}</Row>
            <Row label="Fee">{fee.data ?? (fee.isLoading ? '…' : 'Network fee')}</Row>
            <Row label="Arrives"><span className="inline-flex items-center gap-1"><Zap className="size-3.5" /> Instantly</span></Row>
          </div>
        )}
        {firstTime && (
          <p className="flex items-start gap-2 rounded-2xl p-3 text-xs" style={{ background: 'rgba(245,184,75,0.12)', color: 'var(--warn)' }}>
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            First time paying @{user.handle}. Payments are final and can&apos;t be reversed, so check the handle.
          </p>
        )}
        <PrimaryButton disabled={amount === undefined || insufficient || working} onClick={isPay ? pay : sendRequest}>
          {working ? <><Spinner className="size-4" /> {cta}</> : label}
        </PrimaryButton>
      </div>
    </div>
  )
}
