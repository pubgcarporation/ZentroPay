import { useState } from 'react'
import { erc20Abi } from 'viem'
import { AlertTriangle, Check, Globe, Lock, Pencil, Users } from 'lucide-react'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, api } from '@/lib/api'
import { ARC_CHAIN_ID, USDC_ADDRESS } from '@/lib/chain'
import { formatFee, formatUsdc, parseOnchainError, parseUsdc } from '@/lib/format'
import { Avatar, CloseButton, PrimaryButton, Row, Screen, Spinner } from '@/components/ui'
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
      <Screen className="items-center pb-8 pt-28 text-center">
        <div className="pop grid size-24 place-items-center rounded-full bg-[var(--success)] text-black"><Check className="size-12" strokeWidth={2.4} /></div>
        <p className="mt-6 text-[17px] text-white/75">Request sent to @{user.handle}</p>
        <p className="display mt-1 text-[56px] font-bold tabular-nums">{formatUsdc(amount)}</p>
        <p className="mt-2 max-w-xs text-[16px] text-white/65">They will see it under Payments and can pay you in one tap.</p>
        <div className="mt-auto w-full pt-6"><PrimaryButton onClick={onClose}>Done</PrimaryButton></div>
      </Screen>
    )
  }

  const working = busy !== 'idle'
  const cta = busy === 'switching' ? 'Switching network…' : busy === 'signing' ? 'Confirm in wallet…' : busy === 'confirming' ? 'Confirming…' : 'Saving…'
  const label = amount ? `${isPay ? 'Pay' : 'Request'} ${formatUsdc(amount)}` : 'Enter an amount'

  return (
    <Screen className="pb-6 pt-4">
      <div className="relative flex items-center justify-between">
        <CloseButton onClick={onClose} />
        <button
          onClick={() => !working && setUser(undefined)}
          aria-label="Change recipient"
          className="absolute left-1/2 flex h-[52px] -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.12] py-1.5 pl-2 pr-5"
        >
          <Avatar name={user.name} seed={user.name} size={36} />
          <span className="text-[18px] font-bold">@{user.handle}</span>
          {user.city && <span className="text-[16px] text-white/65">{user.city}</span>}
        </button>
        <span className="size-[52px]" />
      </div>

      <div className="mt-14 flex flex-col items-center">
        <div className="flex items-start justify-center">
          <span className="display mt-3 text-[38px] font-semibold leading-none text-white/65">$</span>
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
            className="display min-w-[1ch] bg-transparent text-center text-[100px] font-bold leading-[1] tabular-nums placeholder:text-white/30"
          />
        </div>
        {isPay && (
          <p className="mt-4 text-[17px] tabular-nums" style={{ color: insufficient ? 'var(--danger)' : 'rgba(255,255,255,0.8)' }}>
            {insufficient ? 'Not enough USDC' : `${balance.data === undefined ? '…' : formatUsdc(balance.data)} available`}
          </p>
        )}
      </div>

      <label className="field mt-9 flex h-[68px] items-center gap-3.5 rounded-full px-6">
        <Pencil className="size-5 shrink-0 text-white/80" />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={100}
          readOnly={start.requestId !== undefined}
          placeholder="What's it for?"
          aria-label="What's it for?"
          className="w-full bg-transparent text-[19px] font-medium"
        />
      </label>

      {isPay && (
        <div className="mt-5 flex justify-center gap-2.5" role="radiogroup" aria-label="Who can see this">
          {VISIBILITY.map(({ key, label: text, icon: Icon }) => (
            <button
              key={key}
              role="radio"
              aria-checked={visibility === key}
              onClick={() => setVisibility(key)}
              className={`flex h-12 items-center gap-2 rounded-full px-5 text-[17px] font-semibold transition-colors ${visibility === key ? 'bg-white text-black' : 'chip-outline text-white'}`}
            >
              <Icon className="size-[18px]" /> {text}
            </button>
          ))}
        </div>
      )}

      {isPay && amount !== undefined && (
        <div className="card mt-5 overflow-hidden rounded-[26px]">
          <Row label={`@${user.handle} gets`}>{formatUsdc(amount)}</Row>
          <Row label="Fee">{fee.data ?? (fee.isLoading ? '…' : 'Network fee')}</Row>
          <Row label="Arrives"><span style={{ color: 'var(--success)' }}>Instantly</span></Row>
        </div>
      )}
      {firstTime && (
        <p className="mt-4 flex items-start gap-3.5 rounded-[22px] border px-5 py-4 text-[16px] leading-snug" style={{ background: 'rgba(245,164,91,0.09)', borderColor: 'rgba(245,164,91,0.35)', color: '#f6e1cb' }}>
          <AlertTriangle className="mt-0.5 size-5 shrink-0" style={{ color: 'var(--warn)' }} />
          First time paying @{user.handle}. Payments can&apos;t be undone.
        </p>
      )}

      <div className="mt-auto pt-6">
        <PrimaryButton disabled={amount === undefined || insufficient} busy={working} onClick={isPay ? pay : sendRequest}>
          {working ? <><Spinner className="size-5" /><span className="sr-only">{cta}</span></> : label}
        </PrimaryButton>
      </div>
    </Screen>
  )
}
