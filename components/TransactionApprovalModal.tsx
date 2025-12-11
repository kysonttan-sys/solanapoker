import React from 'react';
import { Modal } from './ui/Modal';
import { AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface TransactionDetails {
    type: 'deposit' | 'withdraw';
    amount: number; // in SOL
    fee?: number; // estimated fee in SOL
    from?: string; // wallet address
    to?: string; // vault address
}

interface TransactionApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApprove: () => void;
    transaction: TransactionDetails | null;
    loading?: boolean;
}

export const TransactionApprovalModal: React.FC<TransactionApprovalModalProps> = ({
    isOpen,
    onClose,
    onApprove,
    transaction,
    loading = false
}) => {
    if (!transaction) return null;

    const estimatedFee = transaction.fee || 0.000005; // Default Solana fee
    const totalAmount = transaction.type === 'deposit'
        ? transaction.amount + estimatedFee
        : transaction.amount;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                    <div className={`w-16 h-16 rounded-full ${transaction.type === 'deposit' ? 'bg-green-500/20' : 'bg-blue-500/20'} flex items-center justify-center mx-auto mb-4`}>
                        {transaction.type === 'deposit' ? (
                            <span className="text-3xl">📥</span>
                        ) : (
                            <span className="text-3xl">📤</span>
                        )}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                        Approve {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                    </h3>
                    <p className="text-sm text-gray-400">
                        Review the transaction details before approving
                    </p>
                </div>

                {/* Transaction Details */}
                <div className="bg-black/40 border border-white/10 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Type</span>
                        <span className="text-sm font-semibold text-white capitalize">
                            {transaction.type}
                        </span>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Amount</span>
                        <span className="text-lg font-bold text-white">
                            {transaction.amount.toFixed(4)} SOL
                        </span>
                    </div>

                    {transaction.type === 'deposit' && (
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">You'll receive</span>
                            <span className="text-sm font-semibold text-sol-green">
                                {(transaction.amount * 100000).toLocaleString()} chips
                            </span>
                        </div>
                    )}

                    {transaction.type === 'withdraw' && (
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">From balance</span>
                            <span className="text-sm font-semibold text-sol-blue">
                                {(transaction.amount * 100000).toLocaleString()} chips
                            </span>
                        </div>
                    )}

                    <div className="border-t border-white/10 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Network fee (estimated)</span>
                            <span className="text-xs text-gray-400">
                                ~{estimatedFee.toFixed(6)} SOL
                            </span>
                        </div>
                    </div>

                    {transaction.type === 'deposit' && (
                        <div className="border-t border-white/10 pt-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-gray-300">Total deducted</span>
                                <span className="text-sm font-bold text-white">
                                    {totalAmount.toFixed(6)} SOL
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Security Info */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                        <CheckCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
                        <div className="text-xs text-blue-200 space-y-1">
                            <p><strong>Secure Transaction:</strong></p>
                            <ul className="list-disc list-inside ml-2 space-y-0.5">
                                <li>Funds locked in audited smart contract</li>
                                <li>No third-party access to your wallet</li>
                                <li>Transaction verifiable on Solana Explorer</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Warning for large amounts */}
                {transaction.amount > 1 && (
                    <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="text-orange-400 flex-shrink-0 mt-0.5" size={16} />
                            <p className="text-xs text-orange-200">
                                <strong>Large Amount:</strong> You're {transaction.type === 'deposit' ? 'depositing' : 'withdrawing'} {transaction.amount.toFixed(2)} SOL. Double-check the amount is correct.
                            </p>
                        </div>
                    </div>
                )}

                {/* Addresses (condensed) */}
                {(transaction.from || transaction.to) && (
                    <div className="text-xs text-gray-500 space-y-1">
                        {transaction.from && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">From:</span>
                                <span className="font-mono">{transaction.from.slice(0, 4)}...{transaction.from.slice(-4)}</span>
                            </div>
                        )}
                        {transaction.to && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">To:</span>
                                <span className="font-mono">{transaction.to.slice(0, 4)}...{transaction.to.slice(-4)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onApprove}
                        disabled={loading}
                        className={`flex-1 ${
                            transaction.type === 'deposit'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                        } disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2`}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Approving...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={18} />
                                Approve Transaction
                            </>
                        )}
                    </button>
                </div>

                {/* Help Text */}
                <p className="text-center text-xs text-gray-500">
                    By approving, you authorize this transaction to be signed and sent to the Solana blockchain.
                </p>
            </div>
        </Modal>
    );
};
