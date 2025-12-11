import React, { useState } from 'react';
import { useWallet } from '../components/WalletContextProvider';
import { Key, Copy, Download, AlertTriangle, Eye, EyeOff, CheckCircle } from 'lucide-react';

export const WalletSettings: React.FC = () => {
    const { isSocialLogin, exportPrivateKey, publicKey } = useWallet();
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [showKey, setShowKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [exportConfirmed, setExportConfirmed] = useState(false);

    // Only show for social login users
    if (!isSocialLogin) {
        return null;
    }

    const handleExportKey = async () => {
        if (!exportConfirmed) {
            alert('Please confirm you understand the security warnings first');
            return;
        }

        try {
            setLoading(true);
            const key = await exportPrivateKey();
            if (key) {
                setPrivateKey(key);
                setShowKey(true);
            } else {
                alert('Failed to export private key. Please try again.');
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('Error exporting private key');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyKey = () => {
        if (privateKey) {
            navigator.clipboard.writeText(privateKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownloadKey = () => {
        if (privateKey && publicKey) {
            const blob = new Blob([
                `SOLPOKER X - Wallet Backup\n`,
                `=================================\n\n`,
                `Public Key (Wallet Address):\n${publicKey.toBase58()}\n\n`,
                `Private Key (KEEP SECRET!):\n${privateKey}\n\n`,
                `=================================\n`,
                `IMPORTANT SECURITY NOTES:\n`,
                `1. Never share this private key with anyone\n`,
                `2. Store it securely offline (USB drive, paper wallet)\n`,
                `3. Anyone with this key can access your funds\n`,
                `4. Delete this file after backing up to secure storage\n\n`,
                `To import into Phantom:\n`,
                `1. Open Phantom wallet\n`,
                `2. Settings → Add/Connect Wallet → Import Private Key\n`,
                `3. Paste the private key above\n\n`,
                `Generated: ${new Date().toLocaleString()}\n`
            ], { type: 'text/plain' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `solpoker-wallet-backup-${Date.now()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-3">
                <Key className="text-sol-green" size={24} />
                <div>
                    <h3 className="text-lg font-bold text-white">Wallet Security</h3>
                    <p className="text-sm text-gray-400">Export your private key for backup or import into other wallets</p>
                </div>
            </div>

            {/* Warning Box */}
            <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="text-orange-400 flex-shrink-0 mt-1" size={20} />
                    <div className="space-y-2">
                        <h4 className="font-bold text-orange-200">⚠️ Critical Security Warning</h4>
                        <ul className="text-xs text-orange-100 space-y-1 list-disc list-inside">
                            <li>Your private key gives FULL ACCESS to your wallet</li>
                            <li>Never share it with anyone - even SOLPOKER support won't ask for it</li>
                            <li>Store it offline in a secure location (USB drive, paper wallet)</li>
                            <li>Anyone with this key can steal all your funds</li>
                            <li>Make sure you're in a private location before revealing</li>
                        </ul>

                        <label className="flex items-center gap-2 mt-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={exportConfirmed}
                                onChange={(e) => setExportConfirmed(e.target.checked)}
                                className="w-4 h-4 rounded border-orange-500 bg-orange-900/30 checked:bg-orange-500"
                            />
                            <span className="text-xs text-orange-100">
                                I understand the risks and will keep my private key secure
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Export Button */}
            {!privateKey && (
                <button
                    onClick={handleExportKey}
                    disabled={loading || !exportConfirmed}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Exporting...
                        </>
                    ) : (
                        <>
                            <Download size={18} />
                            Export Private Key
                        </>
                    )}
                </button>
            )}

            {/* Private Key Display */}
            {privateKey && (
                <div className="space-y-4">
                    <div className="bg-black/40 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-green-400 flex items-center gap-2">
                                <CheckCircle size={16} />
                                Private Key Exported
                            </span>
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <div className="font-mono text-xs break-all p-3 bg-black/60 rounded border border-white/10">
                            {showKey ? (
                                <span className="text-green-400">{privateKey}</span>
                            ) : (
                                <span className="text-gray-500">••••••••••••••••••••••••••••••••••••••••••••••••••••</span>
                            )}
                        </div>

                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={handleCopyKey}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle size={16} />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={16} />
                                        Copy Key
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleDownloadKey}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Download size={16} />
                                Download Backup
                            </button>
                        </div>
                    </div>

                    {/* Import Instructions */}
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 space-y-3">
                        <h4 className="font-bold text-blue-200 text-sm">📱 How to import into other wallets:</h4>

                        <div className="space-y-2 text-xs text-blue-100">
                            <div>
                                <p className="font-semibold">Phantom Wallet:</p>
                                <ol className="list-decimal list-inside ml-2 space-y-1 text-blue-200">
                                    <li>Open Phantom → Settings → Add/Connect Wallet</li>
                                    <li>Select "Import Private Key"</li>
                                    <li>Paste your private key → Import</li>
                                </ol>
                            </div>

                            <div>
                                <p className="font-semibold">Solflare Wallet:</p>
                                <ol className="list-decimal list-inside ml-2 space-y-1 text-blue-200">
                                    <li>Open Solflare → Access Wallet</li>
                                    <li>Select "Import Wallet" → "Private Key"</li>
                                    <li>Paste your private key → Continue</li>
                                </ol>
                            </div>
                        </div>

                        <p className="text-xs text-blue-300 mt-3">
                            💡 After importing, you can access your SOLPOKER wallet from any device!
                        </p>
                    </div>

                    {/* Final Warning */}
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                        <p className="text-xs text-red-200">
                            🔒 <strong>Remember:</strong> Delete this backup file after storing it securely. Never store your private key in email, cloud storage, or screenshots!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
