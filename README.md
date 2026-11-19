# ZentroPay

Pay friends by @handle instead of a wallet address. Send and request USDC on Arc Testnet, share payments with friends, and like or comment on them.

Built with [Arc Studio](https://studio.arc.io)

## Features
- Claim a handle with your name, city and bio
- Pay or request USDC by handle, with a note and who can see it (Public, Friends, Only us)
- Home feed of payments between you and your friends
- Payments, Friends and Handle tabs

## Tech stack
- App: React, Vite, TypeScript, Tailwind CSS, wagmi, viem, ConnectKit
- Backend (`backend/`): Cloudflare Workers, Hono, D1 (SQLite)

## Development
Prerequisites: [Bun](https://bun.sh) and a browser wallet.

Environment variables (app):
- `VITE_API_URL`: URL of the deployed backend. Leave empty in development, where `/api` is proxied to the local backend.

Run locally (two terminals):
- `bun install`
- `bun run dev` starts the app on port 5173
- `cd backend && bun install && bun run db:local && bun run dev` starts the API on port 8787

Other commands: `bun run build`, `bun run check` (lint and typecheck), `cd backend && bun run typecheck`.

## Deploying the frontend to Vercel
Import the repository in Vercel (settings come from `vercel.json`) and set `VITE_API_URL` to your backend URL.

## Deploying the backend to Cloudflare
See [backend/README.md](backend/README.md).
