# ZentroPay

Request USDC with an invoice, share a payment link, and get paid straight to your wallet on Arc Testnet.

Built with [Arc Studio](https://studio.arc.io)

## Tech stack
React, Vite, TypeScript, Tailwind CSS, wagmi, viem, ConnectKit, Solidity (Foundry).

## Development
Prerequisites: [Bun](https://bun.sh), [Foundry](https://getfoundry.sh), a browser wallet.

Environment variables:
- `VITE_ZENTROPAY_ADDRESS`: address of the deployed ZentroPay contract.

Commands:
- `bun install`
- `bun run dev` to start the app on port 5173
- `bun run build` to build for production
- `bun run check` to lint and typecheck
- `forge build` to compile the contract
