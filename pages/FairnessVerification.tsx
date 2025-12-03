import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
    fetchAndVerifyHand,
    verifyHandBatch,
    exportVerificationProof
} from '../utils/fairnessVerificationClient';

export const FairnessVerification: React.FC = () => {
    const [mode, setMode] = useState<'search' | 'history' | 'batch'>('search');
    const [tableId, setTableId] = useState('');
    const [handNumber, setHandNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [playerStats, setPlayerStats] = useState<any>(null);

    const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:4000';

    const handleVerifySingleHand = async () => {
        if (!tableId.trim() || !handNumber.trim()) {
            setError('Please enter table ID and hand number');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const verification = await fetchAndVerifyHand(
                serverUrl,
                tableId,
                parseInt(handNumber)
            );

            if (!verification.success) {
                setError(verification.error || 'Verification failed');
            } else {
                setResult({
                    type: 'single',
                    hand: verification.hand,
                    verification: verification.verification
                });
            }
        } catch (e) {
            setError('Error: ' + String(e));
        } finally {
            setLoading(false);
        }
    };

    const handleFetchPlayerHistory = async () => {
        if (!playerStats?.playerId) {
            setError('Please connect your wallet first');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(
                `${serverUrl}/api/proof/player/${playerStats.playerId}/history?limit=10`
            );
            const history = await response.json();

            if (response.ok) {
                setResult({
                    type: 'history',
                    hands: history.hands
                });
            } else {
                setError(history.error || 'Failed to fetch history');
            }
        } catch (e) {
            setError('Error: ' + String(e));
        } finally {
            setLoading(false);
        }
    };

    const handleExportProof = () => {
        if (!result) return;
        const proof = exportVerificationProof(result.hand, result.verification);
        const element = document.createElement('a');
        element.setAttribute(
            'href',
            'data:text/plain;charset=utf-8,' + encodeURIComponent(proof)
        );
        element.setAttribute('download', `fairness-proof-${result.hand.handNumber}.txt`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0f172a] to-[#1a1f35] text-white p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">🔍 Fairness Verification</h1>
                    <p className="text-gray-400">
                        Verify that your poker hands are provably fair and transparent
                    </p>
                </div>

                {/* Mode Selector */}
                <div className="flex gap-4 mb-8">
                    <Button
                        onClick={() => {
                            setMode('search');
                            setResult(null);
                        }}
                        className={`flex-1 py-3 ${
                            mode === 'search'
                                ? 'bg-cyan-500 hover:bg-cyan-600'
                                : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >
                        🔎 Verify Hand
                    </Button>
                    <Button
                        onClick={() => {
                            setMode('history');
                            setResult(null);
                        }}
                        className={`flex-1 py-3 ${
                            mode === 'history'
                                ? 'bg-cyan-500 hover:bg-cyan-600'
                                : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >
                        📊 Your History
                    </Button>
                    <Button
                        onClick={() => {
                            setMode('batch');
                            setResult(null);
                        }}
                        className={`flex-1 py-3 ${
                            mode === 'batch'
                                ? 'bg-cyan-500 hover:bg-cyan-600'
                                : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >
                        📈 Batch Verify
                    </Button>
                </div>

                {/* Search Mode */}
                {mode === 'search' && (
                    <div className="bg-[#1a1f35] rounded-lg p-6 border border-cyan-500/20 mb-8">
                        <h2 className="text-xl font-bold mb-4">Verify a Single Hand</h2>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Table ID</label>
                                <input
                                    type="text"
                                    value={tableId}
                                    onChange={(e) => setTableId(e.target.value)}
                                    placeholder="e.g., t1, table_whale_9"
                                    className="w-full bg-[#0f172a] border border-gray-600 rounded px-3 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">
                                    Hand Number
                                </label>
                                <input
                                    type="number"
                                    value={handNumber}
                                    onChange={(e) => setHandNumber(e.target.value)}
                                    placeholder="e.g., 42"
                                    className="w-full bg-[#0f172a] border border-gray-600 rounded px-3 py-2 text-white"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleVerifySingleHand}
                            disabled={loading}
                            className="w-full bg-cyan-500 hover:bg-cyan-600 py-3 font-semibold"
                        >
                            {loading ? 'Verifying...' : '✓ Verify Hand'}
                        </Button>
                    </div>
                )}

                {/* History Mode */}
                {mode === 'history' && (
                    <div className="bg-[#1a1f35] rounded-lg p-6 border border-cyan-500/20 mb-8">
                        <h2 className="text-xl font-bold mb-4">Your Hand History</h2>
                        <p className="text-gray-400 mb-4">
                            Connect your wallet to view all hands you've played and verify them
                        </p>
                        <Button
                            onClick={handleFetchPlayerHistory}
                            disabled={loading}
                            className="w-full bg-cyan-500 hover:bg-cyan-600 py-3 font-semibold"
                        >
                            {loading ? 'Loading...' : '📋 Load My History'}
                        </Button>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500 rounded p-4 mb-8">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Verification Results */}
                {result && (
                    <div className="bg-[#1a1f35] rounded-lg p-6 border border-cyan-500/20">
                        {result.type === 'single' && result.verification && (
                            <>
                                <div className="mb-6">
                                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                        {result.verification.valid ? (
                                            <>
                                                ✅ <span className="text-green-400">Hand Verified</span>
                                            </>
                                        ) : (
                                            <>
                                                ❌ <span className="text-red-400">Verification Failed</span>
                                            </>
                                        )}
                                    </h3>

                                    <div className="grid grid-cols-1 gap-4">
                                        {/* Fairness Data */}
                                        <div className="bg-[#0f172a] rounded p-4">
                                            <h4 className="font-semibold mb-2">Fairness Data</h4>
                                            <div className="space-y-1 text-sm font-mono">
                                                <p>
                                                    Server Seed Hash:{' '}
                                                    <span className="text-cyan-400">
                                                        {result.hand.fairnessData.serverSeedHash.slice(0, 16)}...
                                                    </span>
                                                </p>
                                                <p>
                                                    Client Seed:{' '}
                                                    <span className="text-cyan-400">
                                                        {result.hand.fairnessData.clientSeed}
                                                    </span>
                                                </p>
                                                <p>
                                                    Nonce: <span className="text-cyan-400">{result.hand.fairnessData.nonce}</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Verification Checks */}
                                        <div className="bg-[#0f172a] rounded p-4">
                                            <h4 className="font-semibold mb-2">Verification Checks</h4>
                                            <div className="space-y-2 text-sm">
                                                <p
                                                    className={
                                                        result.verification.checks.seedHashValid
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                    }
                                                >
                                                    {result.verification.checks.seedHashValid
                                                        ? '✅'
                                                        : '❌'}{' '}
                                                    Server Seed Hash Verified
                                                </p>
                                                <p
                                                    className={
                                                        result.verification.checks.deckReproducible
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                    }
                                                >
                                                    {result.verification.checks.deckReproducible
                                                        ? '✅'
                                                        : '❌'}{' '}
                                                    Deck Reproducible
                                                </p>
                                                <p
                                                    className={
                                                        result.verification.checks.communityCardsValid
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                    }
                                                >
                                                    {result.verification.checks.communityCardsValid
                                                        ? '✅'
                                                        : '❌'}{' '}
                                                    Community Cards Valid
                                                </p>
                                            </div>
                                        </div>

                                        {/* Hand Details */}
                                        <div className="bg-[#0f172a] rounded p-4">
                                            <h4 className="font-semibold mb-2">Hand Details</h4>
                                            <div className="space-y-1 text-sm">
                                                <p>
                                                    Winners:{' '}
                                                    <span className="text-cyan-400">
                                                        {result.hand.winners.length} player(s)
                                                    </span>
                                                </p>
                                                <p>
                                                    Pot Amount:{' '}
                                                    <span className="text-cyan-400">
                                                        {result.hand.potAmount} SOL
                                                    </span>
                                                </p>
                                                <p>
                                                    Rake (5%):{' '}
                                                    <span className="text-yellow-400">
                                                        {result.hand.rakeAmount} SOL
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Export Button */}
                                <Button
                                    onClick={handleExportProof}
                                    className="w-full bg-green-600 hover:bg-green-700 py-2"
                                >
                                    📥 Export Proof
                                </Button>
                            </>
                        )}

                        {result.type === 'history' && result.hands && (
                            <>
                                <h3 className="text-xl font-bold mb-4">Your Verified Hands</h3>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {result.hands.map((hand: any) => (
                                        <div
                                            key={hand.handNumber}
                                            className="bg-[#0f172a] rounded p-3 flex justify-between items-center"
                                        >
                                            <div>
                                                <p className="font-semibold">Hand #{hand.handNumber}</p>
                                                <p className="text-sm text-gray-400">
                                                    Pot: {hand.potAmount} SOL | Rake: {hand.rakeAmount} SOL
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => {
                                                    setTableId(hand.tableId);
                                                    setHandNumber(hand.handNumber.toString());
                                                    setMode('search');
                                                }}
                                                className="bg-cyan-500 hover:bg-cyan-600 py-1 px-3 text-sm"
                                            >
                                                Verify
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Info Section */}
                <div className="mt-8 bg-[#1a1f35] rounded-lg p-6 border border-green-500/20">
                    <h3 className="text-xl font-bold mb-4">ℹ️ How It Works</h3>
                    <div className="space-y-2 text-sm text-gray-300">
                        <p>
                            🔒 <strong>Server Seed:</strong> Generated server-side and hashed at hand start. Revealed after hand ends
                            for verification.
                        </p>
                        <p>
                            🎰 <strong>Client Seed:</strong> Your seed, known only to you. Prevents server from predicting future
                            cards.
                        </p>
                        <p>
                            🔄 <strong>Nonce:</strong> Increments with each hand to prevent seed reuse.
                        </p>
                        <p>
                            ✓ <strong>Verification:</strong> Hash the server seed with your client seed and nonce to reproduce the
                            exact deck shuffle.
                        </p>
                        <p>
                            📊 <strong>Transparency:</strong> Every card's position is deterministic and verifiable. No RNG tricks
                            possible.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FairnessVerification;
