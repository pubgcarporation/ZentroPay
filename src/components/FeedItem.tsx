import { useState } from 'react'
import { Heart, Lock, MessageCircle, Send, Users } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, api } from '@/lib/api'
import { Avatar } from '@/components/ui'
import { useSession } from '@/hooks/useSession'
import { formatUsdc, timeAgo } from '@/lib/format'
import type { Comment, Payment } from '@/lib/types'

const label = (user: Payment['from'], me?: string) => (user.address === me ? 'You' : `@${user.handle}`)

export function FeedItem({ payment, showAmount = false }: { payment: Payment; showAmount?: boolean }) {
  const { me, token } = useSession()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const like = useMutation({
    mutationFn: () => api<{ liked: boolean; likes: number }>(`/payments/${payment.id}/like`, { token, method: 'POST', body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not update like.'),
  })

  const comments = useQuery({
    queryKey: ['comments', payment.id],
    enabled: open,
    queryFn: async () => (await api<{ comments: Comment[] }>(`/payments/${payment.id}/comments`, { token })).comments,
  })

  const send = useMutation({
    mutationFn: () => api(`/payments/${payment.id}/comments`, { token, body: { body: draft } }),
    onSuccess: () => {
      setDraft('')
      void queryClient.invalidateQueries({ queryKey: ['comments', payment.id] })
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not post comment.'),
  })

  const incoming = payment.to.address === me?.address
  const VisIcon = payment.visibility === 'private' ? Lock : payment.visibility === 'friends' ? Users : null

  return (
    <article className="flex gap-3 border-b border-white/[0.07] py-4 last:border-b-0">
      <Avatar name={payment.from.name} seed={payment.from.handle} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[14px] leading-snug">
            <span className="font-semibold">{label(payment.from, me?.address)}</span>
            <span style={{ color: 'var(--muted)' }}> paid </span>
            <span className="font-semibold">{label(payment.to, me?.address)}</span>
          </p>
          <span className="shrink-0 text-xs" style={{ color: 'var(--muted)' }}>{timeAgo(payment.createdAt)}</span>
        </div>
        {payment.note && <p className="mt-0.5 text-[14px]">{payment.note}</p>}
        {showAmount && (
          <p className="mt-0.5 text-sm font-semibold tabular-nums" style={{ color: incoming ? 'var(--success)' : undefined }}>
            {incoming ? '+' : '-'}{formatUsdc(BigInt(payment.amount))}
          </p>
        )}
        <div className="mt-2 flex items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
          <button onClick={() => like.mutate()} aria-pressed={payment.liked} aria-label="Like" className="-m-2 flex min-h-11 items-center gap-1 p-2">
            <Heart className="size-4" style={payment.liked ? { fill: '#ff4d6d', color: '#ff4d6d' } : undefined} />
            {payment.likes > 0 && <span className="tabular-nums">{payment.likes}</span>}
          </button>
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Comments" className="-m-2 flex min-h-11 items-center gap-1 p-2">
            <MessageCircle className="size-4" />
            {payment.comments > 0 && <span className="tabular-nums">{payment.comments}</span>}
          </button>
          {VisIcon && <VisIcon className="size-4" aria-label={payment.visibility === 'private' ? 'Only us' : 'Friends'} />}
        </div>

        {open && (
          <div className="mt-2 space-y-2">
            {comments.data?.map((c) => (
              <p key={c.id} className="text-[13px]"><span className="font-semibold">@{c.handle}</span> {c.body}</p>
            ))}
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (draft.trim()) send.mutate()
              }}
            >
              <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={200} placeholder="Add a comment" aria-label="Add a comment" className="min-h-10 w-full rounded-full surface-2 px-4 text-[13px]" />
              <button type="submit" disabled={!draft.trim() || send.isPending} aria-label="Send comment" className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-black disabled:opacity-40">
                <Send className="size-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  )
}
