import React, { FC, ReactNode, createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createAppKit, useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { solana, solanaDevnet, solanaTestnet } from '@reown/appkit/networks';
import type { ChainAdapter } from '@reown/appkit';
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    TrustWalletAdapter,
    CoinbaseWalletAdapter,
    LedgerWalletAdapter,
    TorusWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import type { Provider } from '@reown/appkit-adapter-solana';
import {
    initWeb3Auth,
    connectWithSocial,
    disconnectWeb3Auth,
    isWeb3AuthConnected,
    getWeb3AuthProvider,
    exportPrivateKeyBase58,
    signAndSendTransaction as web3authSignAndSend,
    signMessage as web3authSignMessage,
    Web3AuthUser
} from '../utils/web3auth';
import { getApiUrl } from '../utils/api';

// Reown Project ID
const projectId = 'ce6420e60d19c071df9631a96e4f46e4';

// Metadata for the app
const metadata = {
    name: 'SOLPOKER X',
    description: 'Decentralized Poker Platform on Solana',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://solpokerx.io',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// Initialize Solana adapter with ALL popular Solana wallet adapters
const solanaAdapter = new SolanaAdapter({
    wallets: [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
        new TrustWalletAdapter(),
        new CoinbaseWalletAdapter(),
        new LedgerWalletAdapter(),
        new TorusWalletAdapter()
    ]
});

// Create the AppKit modal - only initialize once
let appKitInitialized = false;

if (!appKitInitialized && typeof window !== 'undefined') {
    createAppKit({
        adapters: [solanaAdapter as unknown as ChainAdapter],
        networks: [solanaDevnet], // Only devnet - no network switching needed
        projectId,
        metadata,
        features: {
            analytics: true,
            // Disable email/social in Reown - we use Web3Auth for social login
            email: false,
            socials: false,
            emailShowWallets: false,
            onramp: true, // Meld.io for buying crypto with fiat
        },
        themeMode: 'dark',
        themeVariables: {
            '--w3m-font-family': 'Inter, system-ui, sans-serif',
            '--w3m-accent': '#14F195',
            '--w3m-color-mix': '#14F195',
            '--w3m-color-mix-strength': 10,
            '--w3m-border-radius-master': '12px',
            '--w3m-z-index': 9999
        },
        allWallets: 'SHOW',
        featuredWalletIds: [
            'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393', // Phantom
            'b3ecad9af029e3b3e3fc89c6f6e5c5b56ef9f8d8e2c28d7ea5cc97abc0e0b0c2', // Solflare
            'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663fc3e1a5e7c6a4f', // Backpack
            '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
            'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
        ],
        allowUnsupportedChain: true, // Allow chains not in our list
        defaultNetwork: solanaDevnet
    });
    appKitInitialized = true;
}

// Connection for Solana RPC
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Custom context to bridge AppKit + Web3Auth with our app
interface WalletContextType {
    connected: boolean;
    connecting: boolean;
    publicKey: PublicKey | null;
    wallet: { adapter: { name: string } } | null;
    connect: () => Promise<void>;
    connectWithGoogle: () => Promise<void>;
    disconnect: () => Promise<void>;
    sendTransaction: (transaction: Transaction | VersionedTransaction) => Promise<string>;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    connection: Connection;
    openModal: () => void;
    openOnRamp: () => void;
    // Web3Auth specific
    isSocialLogin: boolean;
    socialUser: Web3AuthUser | null;
    exportPrivateKey: () => Promise<string | null>;
}

const WalletContext = createContext<WalletContextType | null>(null);

// Hook to use wallet context
export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within WalletContextProvider');
    }
    return context;
};

// Hook to use connection
export const useConnection = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useConnection must be used within WalletContextProvider');
    }
    return { connection: context.connection };
};

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { open } = useAppKit();
    const { address, isConnected, status } = useAppKitAccount();
    const { walletProvider } = useAppKitProvider<Provider>('solana');

    const [connection] = useState(() => new Connection(DEVNET_RPC, 'confirmed'));
    const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
    
    // Web3Auth state
    const [isSocialLogin, setIsSocialLogin] = useState(false);
    const [socialUser, setSocialUser] = useState<Web3AuthUser | null>(null);
    const [web3authConnecting, setWeb3authConnecting] = useState(false);
    const [web3authReady, setWeb3authReady] = useState(false);

    // Initialize Web3Auth on mount
    useEffect(() => {
        initWeb3Auth()
            .then(() => {
                console.log('[WalletContext] Web3Auth initialized');
                setWeb3authReady(true);
            })
            .catch((err) => {
                console.error('[WalletContext] Web3Auth init error:', err);
            });
    }, []);

    // Update publicKey when Reown address changes
    useEffect(() => {
        if (address && isConnected && !isSocialLogin) {
            try {
                setPublicKey(new PublicKey(address));
            } catch (e) {
                console.error('Invalid address:', e);
                setPublicKey(null);
            }
        } else if (!isSocialLogin) {
            setPublicKey(null);
        }
    }, [address, isConnected, isSocialLogin]);

    // Connect using Reown (hardware/extension wallets)
    const connect = async () => {
        await open();
    };

    // Connect using Web3Auth (Google/social login)
    const connectWithGoogle = useCallback(async () => {
        setWeb3authConnecting(true);
        try {
            const result = await connectWithSocial();
            if (result) {
                setIsSocialLogin(true);
                setSocialUser(result.user);
                setPublicKey(new PublicKey(result.user.publicKey));
                
                // Register/update user in database
                try {
                    await fetch(`${getApiUrl()}/api/user/social-login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            walletAddress: result.user.publicKey,
                            email: result.user.email,
                            username: result.user.name,
                            avatarUrl: result.user.profileImage,
                            loginType: result.user.loginType
                        })
                    });
                } catch (e) {
                    console.error('Failed to register social user:', e);
                }
            }
        } catch (error) {
            console.error('Social login error:', error);
        } finally {
            setWeb3authConnecting(false);
        }
    }, []);

    // Disconnect from both Reown and Web3Auth
    const disconnect = async () => {
        if (isSocialLogin) {
            await disconnectWeb3Auth();
            setIsSocialLogin(false);
            setSocialUser(null);
            setPublicKey(null);
        } else {
            await open({ view: 'Account' });
        }
    };

    // Send transaction (supports both Reown and Web3Auth)
    const sendTransaction = async (transaction: Transaction | VersionedTransaction): Promise<string> => {
        console.log('[WalletContext] sendTransaction called, isSocialLogin:', isSocialLogin);
        
        if (isSocialLogin) {
            // Use Web3Auth provider
            console.log('[WalletContext] Using Web3Auth for transaction');
            if (transaction instanceof Transaction) {
                return await web3authSignAndSend(transaction, connection);
            }
            throw new Error('Versioned transactions not supported with social login');
        }

        // Use Reown provider
        if (!walletProvider || !publicKey) {
            throw new Error('Wallet not connected');
        }

        console.log('[WalletContext] Using Reown wallet for transaction');

        try {
            // Check if walletProvider has chain info
            console.log('[WalletContext] walletProvider type:', typeof walletProvider);
            console.log('[WalletContext] walletProvider keys:', Object.keys(walletProvider || {}));
            
            // Check current network from AppKit
            console.log('[WalletContext] isConnected:', isConnected);
            console.log('[WalletContext] address:', address);
            
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            console.log('[WalletContext] Got blockhash:', blockhash);

            if (transaction instanceof Transaction) {
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = publicKey;

                console.log('[WalletContext] Signing transaction with Reown...');
                
                // Try to use the native wallet API directly to bypass Reown chain validation
                const win = window as any;
                
                // Check for Solflare
                if (win.solflare?.isConnected) {
                    console.log('[WalletContext] Using Solflare native API...');
                    try {
                        const signedTx = await win.solflare.signTransaction(transaction);
                        const signature = await connection.sendRawTransaction(signedTx.serialize());
                        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
                        return signature;
                    } catch (e: any) {
                        console.error('[WalletContext] Solflare native error:', e);
                    }
                }
                
                // Check for Phantom
                if (win.phantom?.solana?.isConnected) {
                    console.log('[WalletContext] Using Phantom native API...');
                    try {
                        const signedTx = await win.phantom.solana.signTransaction(transaction);
                        const signature = await connection.sendRawTransaction(signedTx.serialize());
                        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
                        return signature;
                    } catch (e: any) {
                        console.error('[WalletContext] Phantom native error:', e);
                    }
                }
                
                // Fallback to Reown provider
                try {
                    const signedTx = await walletProvider.signTransaction(transaction);
                    console.log('[WalletContext] Transaction signed, sending...');
                    const signature = await connection.sendRawTransaction(signedTx.serialize());

                    await connection.confirmTransaction({
                        signature,
                        blockhash,
                        lastValidBlockHeight
                    });

                    return signature;
                } catch (signError: any) {
                    console.error('[WalletContext] signTransaction error:', signError);
                    
                    // If chain id error, try using signAndSendTransaction method if available
                    if (signError?.message?.toLowerCase().includes('chain')) {
                        console.log('[WalletContext] Chain error - trying signAndSendTransaction...');
                        
                        // Some wallets prefer signAndSendTransaction
                        if (typeof (walletProvider as any).signAndSendTransaction === 'function') {
                            const sig = await (walletProvider as any).signAndSendTransaction(transaction);
                            return typeof sig === 'string' ? sig : sig.signature;
                        }
                    }
                    throw signError;
                }
            } else {
                const signedTx = await walletProvider.signTransaction(transaction);
                const signature = await connection.sendRawTransaction(signedTx.serialize());

                await connection.confirmTransaction({
                    signature,
                    blockhash,
                    lastValidBlockHeight
                });

                return signature;
            }
        } catch (error: any) {
            console.error('[WalletContext] Transaction error:', error);
            console.error('[WalletContext] Error message:', error?.message);
            console.error('[WalletContext] Error details:', JSON.stringify(error, null, 2));
            throw error;
        }
    };

    // Sign message (supports both Reown and Web3Auth)
    const signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
        if (isSocialLogin) {
            return await web3authSignMessage(message);
        }

        if (!walletProvider) {
            throw new Error('Wallet not connected');
        }

        const signature = await walletProvider.signMessage(message);
        return signature;
    };

    // Export private key (only for social login users)
    const exportPrivateKey = async (): Promise<string | null> => {
        if (!isSocialLogin) {
            console.warn('Private key export only available for social login users');
            return null;
        }
        return await exportPrivateKeyBase58();
    };

    const openModal = () => {
        open();
    };

    const openOnRamp = () => {
        open({ view: 'OnRampProviders' });
    };

    const isAnyConnected = isConnected || isSocialLogin;
    const isAnyConnecting = status === 'connecting' || web3authConnecting;

    const contextValue: WalletContextType = {
        connected: isAnyConnected,
        connecting: isAnyConnecting,
        publicKey,
        wallet: isAnyConnected ? { adapter: { name: isSocialLogin ? 'Web3Auth' : 'AppKit' } } : null,
        connect,
        connectWithGoogle,
        disconnect,
        sendTransaction,
        signMessage,
        connection,
        openModal,
        openOnRamp,
        isSocialLogin,
        socialUser,
        exportPrivateKey
    };

    return (
        <WalletContext.Provider value={contextValue}>
            {children}
        </WalletContext.Provider>
    );
};

export default WalletContextProvider;
