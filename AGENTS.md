# ZentroPay

Venmo-style USDC payments by @handle on Arc Testnet (chain 5042002).

- App: Vite + React in `src/`. Backend: Cloudflare Worker + D1 in `backend/`.
- No custom smart contract: payments are plain USDC (0x3600000000000000000000000000000000000000) transfers, verified by the backend from the transaction receipt.
- Dev: Vite proxies `/api` to the local Worker on port 8787.
- Git author for this repo is pubgcarporation (GitHub noreply email). Do not use another identity.
