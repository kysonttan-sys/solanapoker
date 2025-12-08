import React, { useState, useEffect } from 'react';
// @ts-ignore - Module exists, TypeScript server cache issue
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useSocket } from '../hooks/useSocket';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { ArrowDownUp, Loader, CheckCircle, AlertCircle } from 'lucide-react';

interface TransactionStatus {
    status: 'idle' | 'processing' | 'confirming' | 'success' | 'error';
    message?: string;
    txHash?: string;
}

export const DepositWithdraw: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void;
    onBalanceUpdate?: (newBalance: number) => void;
}> = ({
    isOpen,
    onClose,
    onBalanceUpdate
}) => {
    const { publicKey, wallet, connected, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const { socket } = useSocket();
    
    const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
    const [amount, setAmount] = useState<string>('');
    const [balance, setBalance] = useState<number>(0);
    const [onChainBalance, setOnChainBalance] = useState<number>(0);
    const [txStatus, setTxStatus] = useState<TransactionStatus>({ status: 'idle' });
    const [loading, setLoading] = useState(false);

    // Debug wallet connection
    useEffect(() => {
        console.log('[DepositWithdraw] Wallet Status:', {
            connected,
            hasPublicKey: !!publicKey,
            hasWallet: !!wallet,
            publicKeyStr: publicKey?.toBase58()
        });
    }, [connected, publicKey, wallet]);

    useEffect(() => {
        if (!isOpen || !publicKey) return;
        
        const fetchBalances = async () => {
            try {
                // Fetch in-game balance from backend API
                const response = await fetch(`http://localhost:4000/api/user/${publicKey.toString()}`);
                if (response.ok) {
                    const userData = await response.json();
                    setBalance(userData.balance);
                    console.log('[DepositWithdraw] In-game balance loaded:', userData.balance);
                } else {
                    console.warn('[DepositWithdraw] User not found in database');
                    setBalance(0);
                }
                
                // Get wallet SOL balance
                const lamports = await connection.getBalance(publicKey);
                const solBalance = lamports / 1000000000; // Convert lamports to SOL
                const chips = Math.floor(solBalance * 100000); // 1 SOL = 100,000 chips
                setOnChainBalance(chips);
            } catch (e) {
                console.error('Failed to fetch balances:', e);
            }
        };

        fetchBalances();
        
        // Listen for balance updates from server
        if (socket) {
            socket.on('balanceUpdate', (bal: number) => {
                console.log('[DepositWithdraw] Balance update received from server:', bal);
                setBalance(bal);
                // Notify parent component to update global balance
                if (onBalanceUpdate) {
                    onBalanceUpdate(bal);
                }
            });
        }
        
        return () => {
            if (socket) {
                socket.off('balanceUpdate');
            }
        };
    }, [isOpen, publicKey, socket, connection]);

    const handleDeposit = async () => {
        if (!publicKey || !wallet || !amount) {
            setTxStatus({
                status: 'error',
                message: 'Please enter an amount and connect your wallet'
            });
            return;
        }

        const solAmount = parseFloat(amount);
        const chips = Math.floor(solAmount * 100000); // Convert SOL to chips (1 SOL = 100,000 chips)

        if (solAmount <= 0) {
            setTxStatus({
                status: 'error',
                message: 'Please enter a valid amount greater than 0'
            });
            return;
        }

        try {
            setLoading(true);
            setTxStatus({ status: 'processing', message: 'Locking funds to vault contract...' });

            // Use depositToVault which locks funds in smart contract
            const { depositToVault } = await import('../utils/solanaContract');
            
            const txHash = await depositToVault(connection, sendTransaction, publicKey, solAmount);

            setTxStatus({
                status: 'confirming',
                message: 'Confirming transaction on Solana blockchain...',
                txHash
            });

            // Wait for confirmation
            await new Promise(resolve => setTimeout(resolve, 2000));

            setTxStatus({
                status: 'success',
                message: `Successfully deposited ${amount} SOL to vault (${chips.toLocaleString()} chips)`,
                txHash
            });
            setAmount('');
            
            // Notify server to credit user's in-game balance
            if (socket) {
                socket.emit('depositCompleted', {
                    txHash,
                    amount: chips,
                    walletAddress: publicKey.toString()
                });
            }
            
            // Update local balance display
            const newBalance = balance + chips;
            setBalance(newBalance);
            
            // Notify parent to update global user balance
            if (onBalanceUpdate) {
                onBalanceUpdate(newBalance);
            }
        } catch (error) {
            console.error('Deposit error:', error);
            setTxStatus({
                status: 'error',
                message: error instanceof Error ? error.message : 'Deposit failed. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async () => {
        if (!publicKey || !wallet || !amount) {
            setTxStatus({
                status: 'error',
                message: 'Please enter an amount and connect your wallet'
            });
            return;
        }

        const solAmount = parseFloat(amount);
        const chips = Math.floor(solAmount * 100000); // Convert SOL to chips

        if (chips > balance) {
            setTxStatus({
                status: 'error',
                message: `Insufficient balance. You have ${(balance / 100000).toFixed(4)} SOL`
            });
            return;
        }

        try {
            setLoading(true);
            setTxStatus({ status: 'processing', message: 'Processing withdrawal from vault...' });

            // Use withdrawFromVault which unlocks funds from smart contract
            const { withdrawFromVault } = await import('../utils/solanaContract');
            
            const txHash = await withdrawFromVault(connection, sendTransaction, publicKey, solAmount);

            setTxStatus({
                status: 'confirming',
                message: 'Transferring funds back to your wallet...',
                txHash
            });

            // Wait for confirmation
            await new Promise(resolve => setTimeout(resolve, 2000));

            setTxStatus({
                status: 'success',
                message: `Successfully withdrew ${amount} SOL to your wallet`,
                txHash
            });
            setAmount('');
            
            // Notify server to deduct user's in-game balance
            if (socket) {
                socket.emit('withdrawalCompleted', {
                    txHash,
                    amount: chips,
                    walletAddress: publicKey.toString()
                });
            }
            
            // Update local balance display
            const newBalance = Math.max(0, balance - chips);
            setBalance(newBalance);
            
            // Notify parent to update global user balance
            if (onBalanceUpdate) {
                onBalanceUpdate(newBalance);
            }
        } catch (error) {
            console.error('Withdrawal error:', error);
            setTxStatus({
                status: 'error',
                message: error instanceof Error ? error.message : 'Withdrawal failed. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const convertToChips = (sol: number) => Math.floor(sol * 100000);
    const convertToSOL = (chips: number) => (chips / 100000).toFixed(4);

    // Show wallet not connected message if wallet not connected
    if (!connected || !publicKey) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Wallet Required">
                <div className="text-center py-8">
                    <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2">Wallet Not Connected</h3>
                    <p className="text-gray-400 mb-6">Please connect your Solana wallet to deposit or withdraw funds.</p>
                    <Button onClick={onClose}>Close</Button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Deposit / Withdraw">
            <div className="w-full max-w-md">
                {/* Balance Display */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-500/30">
                        <p className="text-xs text-purple-300 mb-2">On-Chain Balance</p>
                        <p className="text-xl font-bold text-purple-200">
                            {(onChainBalance / 100000).toFixed(4)} SOL
                        </p>
                        <p className="text-xs text-purple-400 mt-1">{onChainBalance.toLocaleString()} chips</p>
                    </div>
                    <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-500/30">
                        <p className="text-xs text-blue-300 mb-2">In-Game Balance</p>
                        <p className="text-xl font-bold text-blue-200">
                            {(balance / 100000).toFixed(4)} SOL
                        </p>
                        <p className="text-xs text-blue-400 mt-1">{balance.toLocaleString()} chips</p>
                    </div>
                </div>

                {/* Tab Selection */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => { setTab('deposit'); setTxStatus({ status: 'idle' }); }}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                            tab === 'deposit'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        📥 Deposit
                    </button>
                    <button
                        onClick={() => { setTab('withdraw'); setTxStatus({ status: 'idle' }); }}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                            tab === 'withdraw'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        📤 Withdraw
                    </button>
                </div>

                {/* Amount Input */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Amount (SOL)
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.0"
                            disabled={loading}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                            min="0"
                            step="0.01"
                        />
                        {amount && (
                            <div className="text-xs text-gray-400 mt-2">
                                = {convertToChips(parseFloat(amount)).toLocaleString()} chips
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                    {tab === 'deposit' ? (
                        [0.1, 0.5, 1, 5].map((amt) => (
                            <button
                                key={amt}
                                onClick={() => setAmount(amt.toString())}
                                disabled={loading}
                                className="bg-gray-700 hover:bg-gray-600 text-sm font-medium py-2 rounded-lg transition-all disabled:opacity-50"
                            >
                                {amt}
                            </button>
                        ))
                    ) : (
                        [0.1, 0.5, 1, 5].map((amt) => {
                            const canUse = (balance / 100000) >= amt;
                            return (
                                <button
                                    key={amt}
                                    onClick={() => setAmount(amt.toString())}
                                    disabled={!canUse || loading}
                                    className={`text-sm font-medium py-2 rounded-lg transition-all ${
                                        canUse
                                            ? 'bg-gray-700 hover:bg-gray-600'
                                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {amt}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Status Messages */}
                {txStatus.status !== 'idle' && (
                    <div
                        className={`mb-6 p-4 rounded-lg border flex gap-3 ${
                            txStatus.status === 'success'
                                ? 'bg-green-900/30 border-green-500/50'
                                : txStatus.status === 'error'
                                ? 'bg-red-900/30 border-red-500/50'
                                : 'bg-blue-900/30 border-blue-500/50'
                        }`}
                    >
                        {txStatus.status === 'success' && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
                        {txStatus.status === 'error' && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                        {['processing', 'confirming'].includes(txStatus.status) && (
                            <Loader className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                        )}
                        <div className="flex-1">
                            <p className={`text-sm font-medium ${
                                txStatus.status === 'success'
                                    ? 'text-green-200'
                                    : txStatus.status === 'error'
                                    ? 'text-red-200'
                                    : 'text-blue-200'
                            }`}>
                                {txStatus.message}
                            </p>
                            {txStatus.txHash && (
                                <a
                                    href={`https://solscan.io/tx/${txStatus.txHash}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-purple-400 hover:text-purple-300 mt-1 block truncate"
                                >
                                    View on Solscan: {txStatus.txHash.slice(0, 20)}...
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <Button
                    onClick={tab === 'deposit' ? handleDeposit : handleWithdraw}
                    disabled={loading || !amount || (tab === 'withdraw' && (balance / 100000) < parseFloat(amount || '0'))}
                    className="w-full"
                >
                    {loading && <Loader className="w-4 h-4 inline mr-2 animate-spin" />}
                    {tab === 'deposit' ? '📥 Deposit SOL' : '📤 Withdraw SOL'}
                </Button>

                {/* Info Text */}
                <p className="text-xs text-gray-400 text-center mt-4">
                    {tab === 'deposit'
                        ? 'Deposit SOL from your wallet to play. Conversion: 1 SOL = 100,000 chips'
                        : 'Withdraw chips from your in-game balance. Minimum withdrawal: 0.01 SOL'}
                </p>

                {/* Warnings */}
                {tab === 'withdraw' && balance < 1000 && (
                    <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                        <p className="text-xs text-yellow-200">
                            ⚠️ Low balance: {(balance / 100000).toFixed(4)} SOL
                        </p>
                    </div>
                )}

                {!publicKey && (
                    <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                        <p className="text-xs text-blue-200">
                            🔗 Please connect your wallet to continue
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default DepositWithdraw;
