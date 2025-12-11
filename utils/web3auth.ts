/* eslint-disable @typescript-eslint/no-explicit-any */
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK, IProvider, WALLET_ADAPTERS } from "@web3auth/base";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

// Web3Auth Client ID - Get from https://dashboard.web3auth.io
const WEB3AUTH_CLIENT_ID = "BBay8TZD5ODCMijnE-DtBM4vvt-fTmg3MZJWesSloUKjVEpunRSkch9M2EHxz5I3EtMFTrvrxi2nMvohkNVg7M4";

// Solana Devnet Configuration
const SOLANA_CHAIN_CONFIG = {
    chainNamespace: CHAIN_NAMESPACES.SOLANA,
    chainId: "0x3", // Devnet
    rpcTarget: "https://api.devnet.solana.com",
    displayName: "Solana Devnet",
    blockExplorerUrl: "https://explorer.solana.com/?cluster=devnet",
    ticker: "SOL",
    tickerName: "Solana",
    logo: "https://images.toruswallet.io/solana.svg",
};

let web3authInstance: Web3Auth | null = null;

export interface Web3AuthUser {
    email: string;
    name: string;
    profileImage: string;
    publicKey: string;
    loginType: string;
}

/**
 * Initialize Web3Auth for social login
 */
export const initWeb3Auth = async (): Promise<Web3Auth> => {
    if (web3authInstance) {
        return web3authInstance;
    }

    try {
        // Create Solana provider
        const solanaProvider = new SolanaPrivateKeyProvider({
            config: { chainConfig: SOLANA_CHAIN_CONFIG }
        });

        // Create Web3Auth instance
        // Try SAPPHIRE_DEVNET first - change to SAPPHIRE_MAINNET for production
        web3authInstance = new Web3Auth({
            clientId: WEB3AUTH_CLIENT_ID,
            web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
            chainConfig: SOLANA_CHAIN_CONFIG,
            privateKeyProvider: solanaProvider,
            uiConfig: {
                appName: "SOLPOKER X",
                appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://solpokerx.io',
                theme: { primary: "#14F195" },
                mode: "dark",
                defaultLanguage: "en",
                loginGridCol: 3,
                primaryButton: "socialLogin",
            }
        });

        // Initialize modal with specific login methods
        await web3authInstance.initModal({
            modalConfig: {
                [WALLET_ADAPTERS.AUTH]: {
                    label: "auth",
                    loginMethods: {
                        // Show these login methods
                        google: { name: "google", showOnModal: true },
                        facebook: { name: "facebook", showOnModal: true },
                        discord: { name: "discord", showOnModal: true },
                        apple: { name: "apple", showOnModal: true },
                        twitter: { name: "twitter", showOnModal: true }, // X (Twitter)
                        wechat: { name: "wechat", showOnModal: true },
                        email_passwordless: { name: "email_passwordless", showOnModal: true },
                        // Hide all other methods
                        reddit: { name: "reddit", showOnModal: false },
                        line: { name: "line", showOnModal: false },
                        github: { name: "github", showOnModal: false },
                        kakao: { name: "kakao", showOnModal: false },
                        linkedin: { name: "linkedin", showOnModal: false },
                        weibo: { name: "weibo", showOnModal: false },
                        twitch: { name: "twitch", showOnModal: false },
                        sms_passwordless: { name: "sms_passwordless", showOnModal: false },
                        farcaster: { name: "farcaster", showOnModal: false },
                    },
                },
                // Hide Torus Solana wallet option
                [WALLET_ADAPTERS.TORUS_SOLANA]: {
                    label: "torus",
                    showOnModal: false,
                },
            },
        });

        console.log("[Web3Auth] Initialized successfully, status:", web3authInstance.status);
        return web3authInstance;
    } catch (error) {
        console.error("[Web3Auth] Initialization error:", error);
        throw error;
    }
};

// Track initialization status
let isInitializing = false;
let initPromise: Promise<Web3Auth> | null = null;

/**
 * Ensure Web3Auth is fully initialized
 */
export const ensureWeb3AuthReady = async (): Promise<Web3Auth> => {
    if (web3authInstance && web3authInstance.status === "connected") {
        return web3authInstance;
    }
    
    if (web3authInstance && web3authInstance.status === "ready") {
        return web3authInstance;
    }
    
    if (initPromise) {
        return initPromise;
    }
    
    if (isInitializing) {
        // Wait for existing initialization
        await new Promise(resolve => setTimeout(resolve, 500));
        return ensureWeb3AuthReady();
    }
    
    isInitializing = true;
    initPromise = initWeb3Auth();
    
    try {
        const instance = await initPromise;
        isInitializing = false;
        return instance;
    } catch (error) {
        isInitializing = false;
        initPromise = null;
        throw error;
    }
};

/**
 * Connect with social login (Google, Facebook, etc.)
 */
export const connectWithSocial = async (): Promise<{ user: Web3AuthUser; provider: IProvider } | null> => {
    try {
        // Ensure Web3Auth is fully ready before connecting
        const web3auth = await ensureWeb3AuthReady();
        
        // Check if already connected
        if (web3auth.connected && web3auth.provider) {
            const userInfo = await web3auth.getUserInfo() as any;
            const accounts = await (web3auth.provider.request({ method: "getAccounts" }) as Promise<string[]>);
            const publicKey = accounts?.[0] || "";
            
            return {
                user: {
                    email: userInfo?.email || "",
                    name: userInfo?.name || userInfo?.email?.split("@")[0] || "User",
                    profileImage: userInfo?.profileImage || "",
                    publicKey,
                    loginType: userInfo?.typeOfLogin || userInfo?.verifier || "social"
                },
                provider: web3auth.provider
            };
        }
        
        // Wait a bit more for modal to be ready
        if (web3auth.status !== "ready") {
            console.log("[Web3Auth] Waiting for ready status, current:", web3auth.status);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Connect - this opens the Web3Auth modal
        console.log("[Web3Auth] Opening connect modal...");
        const provider = await web3auth.connect();
        
        if (!provider) {
            console.error("[Web3Auth] No provider returned");
            return null;
        }

        // Get user info
        const userInfo = await web3auth.getUserInfo() as any;
        
        // Get Solana accounts using type assertion
        const accounts = await (provider.request({ method: "getAccounts" }) as Promise<string[]>);
        const publicKey = accounts?.[0] || "";

        const user: Web3AuthUser = {
            email: userInfo?.email || "",
            name: userInfo?.name || userInfo?.email?.split("@")[0] || "User",
            profileImage: userInfo?.profileImage || "",
            publicKey,
            loginType: userInfo?.typeOfLogin || userInfo?.verifier || "social"
        };

        console.log("[Web3Auth] Connected:", user);
        return { user, provider };
    } catch (error) {
        console.error("[Web3Auth] Connection error:", error);
        return null;
    }
};

/**
 * Disconnect from Web3Auth
 */
export const disconnectWeb3Auth = async (): Promise<void> => {
    if (web3authInstance?.connected) {
        await web3authInstance.logout();
        console.log("[Web3Auth] Disconnected");
    }
};

/**
 * Check if user is connected via Web3Auth
 */
export const isWeb3AuthConnected = (): boolean => {
    return web3authInstance?.connected || false;
};

/**
 * Get the connected provider
 */
export const getWeb3AuthProvider = (): IProvider | null => {
    return web3authInstance?.provider || null;
};

/**
 * Get user's private key (for export) - user can backup their key
 * The private key is managed by Web3Auth MPC (Multi-Party Computation)
 * and is NEVER stored on our servers
 */
export const getPrivateKey = async (): Promise<string | null> => {
    try {
        const provider = getWeb3AuthProvider();
        if (!provider) return null;

        // Request private key from provider
        const privateKey = await provider.request({
            method: "solanaPrivateKey"
        }) as string | null;

        return privateKey || null;
    } catch (error) {
        console.error("[Web3Auth] Error getting private key:", error);
        return null;
    }
};

/**
 * Export private key as Base58 (Solana standard format)
 */
export const exportPrivateKeyBase58 = async (): Promise<string | null> => {
    try {
        const privateKeyHex = await getPrivateKey();
        if (!privateKeyHex) return null;

        // Convert hex to Uint8Array
        const privateKeyBytes = Buffer.from(privateKeyHex, "hex");
        
        // Encode as Base58
        return bs58.encode(privateKeyBytes);
    } catch (error) {
        console.error("[Web3Auth] Error exporting private key:", error);
        return null;
    }
};

/**
 * Sign a transaction with the Web3Auth wallet
 */
export const signTransaction = async (transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction> => {
    const provider = getWeb3AuthProvider();
    if (!provider) {
        throw new Error("Not connected to Web3Auth");
    }

    // Serialize transaction
    const serializedTx = transaction.serialize({ requireAllSignatures: false });
    const message = Buffer.from(serializedTx).toString("base64");

    // Sign with provider
    const result = await provider.request({
        method: "signTransaction",
        params: { message }
    }) as { signature: string } | null;

    if (!result?.signature) {
        throw new Error("Failed to sign transaction");
    }

    return transaction;
};

/**
 * Sign and send a transaction
 */
export const signAndSendTransaction = async (
    transaction: Transaction,
    connection: Connection
): Promise<string> => {
    const provider = getWeb3AuthProvider();
    if (!provider) {
        throw new Error("Not connected to Web3Auth");
    }

    try {
        // Get user's public key for fee payer
        const accounts = await provider.request({
            method: "getAccounts"
        }) as string[] | null;

        if (!accounts || accounts.length === 0) {
            throw new Error("No accounts found in Web3Auth provider");
        }

        const { PublicKey, Keypair } = await import("@solana/web3.js");
        const userPublicKey = new PublicKey(accounts[0]);

        // Get latest blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPublicKey;

        console.log("[Web3Auth] Preparing transaction for signing...");

        // Get private key from Web3Auth to sign manually
        // This avoids the partialSign issue
        const privateKeyHex = await provider.request({
            method: "solanaPrivateKey"
        }) as string;

        if (!privateKeyHex) {
            throw new Error("Failed to get private key from Web3Auth");
        }

        // Convert hex private key to Keypair
        const privateKeyBytes = Buffer.from(privateKeyHex, "hex");
        const keypair = Keypair.fromSecretKey(privateKeyBytes);

        console.log("[Web3Auth] Signing transaction with keypair...");

        // Sign the transaction with the keypair
        transaction.sign(keypair);

        console.log("[Web3Auth] Sending transaction to Solana...");

        // Send the signed transaction
        const signature = await connection.sendRawTransaction(
            transaction.serialize(),
            {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            }
        );

        console.log("[Web3Auth] Transaction sent, signature:", signature);

        // Confirm transaction
        await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
        }, 'confirmed');

        console.log("[Web3Auth] Transaction confirmed!");
        return signature;
    } catch (error: any) {
        console.error("[Web3Auth] Transaction error:", error);

        // Provide more helpful error messages
        if (error?.message?.includes('0x1')) {
            throw new Error("Insufficient SOL balance for transaction fee");
        } else if (error?.message?.includes('0x0')) {
            throw new Error("Transaction failed - please try again");
        } else if (error?.message?.includes('blockhash')) {
            throw new Error("Transaction expired - please try again");
        }

        throw new Error(error?.message || "Transaction failed");
    }
};

/**
 * Sign a message
 */
export const signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
    const provider = getWeb3AuthProvider();
    if (!provider) {
        throw new Error("Not connected to Web3Auth");
    }

    const encodedMessage = Buffer.from(message).toString("base64");

    const result = await provider.request({
        method: "signMessage",
        params: { message: encodedMessage }
    }) as { signature: string } | null;

    if (!result?.signature) {
        throw new Error("Failed to sign message");
    }

    return Buffer.from(result.signature, "base64");
};

export default {
    initWeb3Auth,
    connectWithSocial,
    disconnectWeb3Auth,
    isWeb3AuthConnected,
    getPrivateKey,
    exportPrivateKeyBase58,
    signTransaction,
    signAndSendTransaction,
    signMessage
};
