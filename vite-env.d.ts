/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SERVER_URL: string;
    readonly VITE_WEB3AUTH_CLIENT_ID: string;
    readonly VITE_RPC_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
