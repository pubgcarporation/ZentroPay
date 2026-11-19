# ZentroPay backend

Cloudflare Worker (Hono) with a D1 database. It stores handles, profiles, payment notes and visibility, likes, comments and money requests. Money never passes through it: payments are USDC transfers made from the user's wallet, and the backend checks each one on Arc before recording it.

## Setup
1. `bun install`
2. `bunx wrangler d1 create zentropay` and paste the returned `database_id` into `wrangler.toml`.
3. `bun run db:remote` to create the tables.
4. Set `ALLOWED_ORIGINS` in `wrangler.toml` to your frontend origin (comma separated; `*` allows all).
5. `bun run deploy`.
6. In the app, set `VITE_API_URL` to the Worker URL and rebuild.

## Local development
`bun run db:local` then `bun run dev` (port 8787). The app's Vite server proxies `/api` to it.

## Configuration (`wrangler.toml` vars)
- `ALLOWED_ORIGINS`: allowed frontend origins
- `ARC_RPC_URL`: Arc RPC used to verify payments
- `USDC_ADDRESS`: USDC token address on Arc
- `EXPLORER_URL`: block explorer base URL

## Sign-in
Wallets sign a one-time message (no gas). The Worker verifies the signature and issues a 7-day session token. Only externally owned accounts are supported.
