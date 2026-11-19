import { useState } from 'react'
import { Globe, Heart, Lock, MessageCircle, Send, Users } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, api } from '@/lib/api'
import { Avatar } from '@/components/ui'
import { useSession } from '@/hooks/useSession'
import { formatUsdc, timeAgo } from '@/lib/format'
import type { Comment, Payment } from '@/lib/types'

const handleOf = (user: Payment['from'], me?: string) => (user.address === me ? 'You' : `@${user.handle}`)
const VIS_ICON = { public: Globe, friends: Users, private: Lock } as const
const VIS_LABEL = { public: 'Public', friends: 'Friends', private: 'Only us' } as const

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
  const VisIcon = payment.visibility === 'public' ? null : VIS_ICON[payment.visibility]

  return (
    <article className="flex gap-3.5 border-b border-white/[0.07] py-4 last:border-b-0">
      <Avatar name={payment.from.name} seed={payment.from.name} size={46} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[16px] leading-snug">
            <span className="font-bold">{handleOf(payment.from, me?.address)}</span>
            <span className="text-white/65"> paid </span>
            <span className="font-bold">{handleOf(payment.to, me?.address)}</span>
          </p>
          <span className="shrink-0 text-[15px] text-white/65">{timeAgo(payment.createdAt)}</span>
        </div>
        {payment.note && <p className="mt-0.5 text-[16px]">{payment.note}</p>}
        {showAmount && (
          <p className="mt-0.5 text-[16px] font-bold tabular-nums" style={{ color: incoming ? 'var(--success)' : undefined }}>
            {incoming ? '+' : '-'}{formatUsdc(BigInt(payment.amount))}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-4 text-[15px] text-white/70">
          <button onClick={() => like.mutate()} aria-pressed={payment.liked} aria-label="Like" className="-ml-1 flex h-9 items-center gap-1.5 px-1" style={payment.liked ? { color: 'var(--pink)' } : undefined}>
            <Heart className="size-[18px]" style={payment.liked ? { fill: 'var(--pink)' } : undefined} />
            {payment.likes > 0 && <span className="tabular-nums">{payment.likes}</span>}
          </button>
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Comments" className="flex h-9 items-center gap-1.5 px-1">
            <MessageCircle className="size-[18px]" />
            {payment.comments > 0 && <span className="tabular-nums">{payment.comments}</span>}
          </button>
          {VisIcon && <VisIcon className="size-[17px]" aria-label={VIS_LABEL[payment.visibility]} />}
        </div>

        {open && (
          <div className="mt-2 space-y-2">
            {comments.data?.map((c) => (
              <p key={c.id} className="text-[15px]"><span className="font-bold">@{c.handle}</span> {c.body}</p>
            ))}
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (draft.trim()) send.mutate()
              }}
            >
              <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={200} placeholder="Add a comment" aria-label="Add a comment" className="field h-11 w-full rounded-full px-4 text-[15px]" />
              <button type="submit" disabled={!draft.trim() || send.isPending} aria-label="Send comment" className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-black disabled:opacity-40">
                <Send className="size-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  )
}
