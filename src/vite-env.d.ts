/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the deployed ZentroPay backend (Cloudflare Worker). Empty in dev. */
  readonly VITE_API_URL?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
