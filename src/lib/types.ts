import type { Address } from 'viem'

export interface User {
  address: Address
  handle: string
  name: string
  city: string
  bio: string
}

export type Visibility = 'public' | 'friends' | 'private'

export interface Payment {
  id: number
  txHash: `0x${string}`
  /** USDC base units (6 decimals) as a decimal string. */
  amount: string
  note: string
  visibility: Visibility
  createdAt: number
  from: User
  to: User
  likes: number
  comments: number
  liked: boolean
  mine: boolean
}

export interface MoneyRequest {
  id: number
  amount: string
  note: string
  status: 'pending' | 'paid' | 'declined' | 'cancelled'
  createdAt: number
  direction: 'incoming' | 'outgoing'
  /** The person asking for money. */
  from: User
  /** The person being asked to pay. */
  to: User
}

export interface Comment {
  id: number
  body: string
  createdAt: number
  handle: string
  name: string
}

export interface Friend extends User {
  lastAt: number
  payments: number
}
