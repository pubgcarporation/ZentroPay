import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, api } from '@/lib/api'
import { formatUsdc, timeAgo } from '@/lib/format'
import { Avatar, Spinner } from '@/components/ui'
import { FeedItem } from '@/components/FeedItem'
import { useFeed, useRequests } from '@/hooks/useApiQueries'
import { useSession } from '@/hooks/useSession'
import type { FlowStart } from '@/components/PayFlow'
import type { MoneyRequest } from '@/lib/types'

export function PaymentsTab({ onStart }: { onStart: (start: FlowStart) => void }) {
  const { token } = useSession()
  const queryClient = useQueryClient()
  const feed = useFeed('you')
  const requests = useRequests()

  const close = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'decline' | 'cancel' }) => api(`/requests/${id}/${action}`, { token, body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests'] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not update the request.'),
  })

  const pending = (requests.data ?? []).filter((r) => r.status === 'pending')

  return (
    <div className="pb-6 pt-5">
      <h1 className="display text-2xl font-bold">Payments</h1>

      {pending.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>Requests</h2>
          {pending.map((r) => (
            <RequestRow
              key={r.id}
              request={r}
              onPay={() => onStart({ mode: 'pay', user: r.from, amount: BigInt(r.amount), note: r.note, requestId: r.id })}
              onClose={() => close.mutate({ id: r.id, action: r.direction === 'incoming' ? 'decline' : 'cancel' })}
            />
          ))}
        </section>
      )}

      <section className="mt-4">
        <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>History</h2>
        {feed.isLoading ? (
          <div className="grid place-items-center py-10" style={{ color: 'var(--muted)' }}><Spinner /></div>
        ) : feed.data && feed.data.length > 0 ? (
          feed.data.map((p) => <FeedItem key={p.id} payment={p} showAmount />)
        ) : (
          <p className="py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>No payments yet.</p>
        )}
      </section>
    </div>
  )
}

function RequestRow({ request, onPay, onClose }: { request: MoneyRequest; onPay: () => void; onClose: () => void }) {
  const incoming = request.direction === 'incoming'
  const other = incoming ? request.from : request.to
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.07] py-3 last:border-b-0">
      <Avatar name={other.name} seed={other.handle} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">
          {incoming ? `@${other.handle} requested` : `You requested from @${other.handle}`} {formatUsdc(BigInt(request.amount))}
        </div>
        <div className="truncate text-xs" style={{ color: 'var(--muted)' }}>{request.note || 'No note'} · {timeAgo(request.createdAt)}</div>
      </div>
      {incoming && <button onClick={onPay} className="min-h-11 rounded-full bg-white px-4 text-[13px] font-semibold text-black">Pay</button>}
      <button onClick={onClose} className="min-h-11 rounded-full surface-2 px-3.5 text-[13px] font-semibold">{incoming ? 'Decline' : 'Cancel'}</button>
    </div>
  )
}
