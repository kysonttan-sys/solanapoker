
import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletConnectWalletAdapter } from '@solana/wallet-adapter-walletconnect';
import { clusterApiUrl } from '@solana/web3.js';

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    // SETTING NETWORK TO DEVNET (More reliable faucets than Testnet)
    const network = WalletAdapterNetwork.Devnet;

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
            // WalletConnect Adapter for Mobile Wallets
            new WalletConnectWalletAdapter({
                network,
                options: {
                    projectId: 'ce6420e60d19c071df9631a96e4f46e4',
                    metadata: {
                        name: 'SOLPOKER X',
                        description: 'Decentralized Poker Platform on Solana',
                        url: typeof window !== 'undefined' ? window.location.origin : 'https://solpokerx.io',
                        icons: ['https://avatars.githubusercontent.com/u/37784886']
                    },
                },
            }),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
};
